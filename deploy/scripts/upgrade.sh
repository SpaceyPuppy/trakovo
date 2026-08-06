#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${INSTANCE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
cd "$ROOT_DIR"

if [[ ! -f .env || ! -f compose.yaml ]]; then
  echo "This directory is not a Trakovo container instance: $ROOT_DIR" >&2
  exit 1
fi

version=""
image=""
skip_backup=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) version="${2:?--version requires a tag}"; shift 2 ;;
    --image) image="${2:?--image requires a full image reference}"; shift 2 ;;
    --skip-backup) skip_backup=true; shift ;;
    -h|--help)
      cat <<'EOF'
Usage: ./upgrade.sh --version vX.Y.Z [--skip-backup]
       ./upgrade.sh --image ghcr.io/spaceypuppy/trakovo:tag [--skip-backup]

The command takes a database/upload backup, enables maintenance mode, pulls the
selected image, runs checksummed database migrations, and only then brings the
site back online. A failed migration leaves maintenance mode enabled.
EOF
      exit 0
      ;;
    *)
      if [[ -z "$version" && "$1" != -* ]]; then
        version="$1"
        shift
      else
        echo "Unknown option: $1" >&2
        exit 1
      fi
      ;;
  esac
done

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "$image" ]]; then
  [[ -n "$version" ]] || { echo "Provide --version or --image." >&2; exit 1; }
  image="${TRAKOVO_IMAGE%:*}:$version"
fi
old_image="$TRAKOVO_IMAGE"

lock_file="$ROOT_DIR/.upgrade.lock"
exec 9>"$lock_file"
if ! flock -n 9; then
  echo "Another Trakovo upgrade is already running in $ROOT_DIR." >&2
  exit 1
fi

set_env() {
  local key="$1" value="$2"
  if grep -qE "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

compose=(docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/compose.yaml")
profiles=()
[[ "${DB_MODE:-bundled}" == "bundled" ]] && profiles+=(--profile bundled-db)
[[ "${TRAKOVO_PROXY_MODE:-caddy}" == "cloudflare" ]] && profiles+=(--profile cloudflare)

if [[ "$skip_backup" != true ]]; then
  "$ROOT_DIR/backup.sh"
fi

set_env TRAKOVO_IMAGE "$image"
set_env MAINTENANCE_MODE true

if ! "${compose[@]}" pull app; then
  set_env TRAKOVO_IMAGE "$old_image"
  set_env MAINTENANCE_MODE false
  echo "Could not pull $image. The current application was not restarted." >&2
  exit 1
fi

"${compose[@]}" up -d --no-deps --force-recreate app

if ! "${compose[@]}" run --rm --no-deps app node /app/tools/db.mjs migrate; then
  echo "Migration failed. Maintenance mode remains enabled." >&2
  echo "Fix the migration or restore the backup, then rerun upgrade.sh." >&2
  exit 1
fi

set_env MAINTENANCE_MODE false
"${compose[@]}" "${profiles[@]}" up -d --no-deps --force-recreate app

if [[ "${TRAKOVO_PROXY_MODE:-caddy}" == "cloudflare" ]]; then
  "${compose[@]}" "${profiles[@]}" up -d cloudflared
fi

health_url="http://127.0.0.1:${TRAKOVO_HTTP_PORT:-3000}/api/health"
for attempt in {1..30}; do
  if curl -fsS --max-time 3 "$health_url" >/dev/null 2>&1; then
    echo "Trakovo upgrade complete: $image"
    exit 0
  fi
  sleep 2
done

set_env MAINTENANCE_MODE true
echo "The container started but did not pass its health check: $health_url" >&2
exit 1
