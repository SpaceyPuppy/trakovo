#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

usage() {
  cat <<'EOF'
Trakovo container installer

Usage: bash deploy/scripts/install.sh [options]

Options:
  --instance NAME             Instance slug, e.g. dev
  --domain HOSTNAME           Public hostname, e.g. dev.example.com
  --root PATH                 Instance directory (default: /opt/trakovo/NAME)
  --proxy caddy|cloudflare|external
  --db bundled|external
  --db-engine mariadb|mysql    Bundled database image (default: mariadb)
  --db-bootstrap fresh|import|existing
  --db-dump PATH              SQL or .sql.gz dump to import into an empty database
  --image IMAGE               Tagged application image
  --admin-username USER
  --admin-password PASSWORD   Prefer the interactive prompt or an environment variable
  --cloudflare-token TOKEN    Token for a per-instance Cloudflare Tunnel
  --non-interactive           Require all values that cannot safely be defaulted
  -h, --help

DNS records must already point the hostname at the VPS for Caddy, or be configured
as a public hostname on the selected Cloudflare Tunnel.
EOF
}

die() { echo "Error: $*" >&2; exit 1; }
random_hex() { openssl rand -hex "${1:-32}"; }

escape_dotenv() {
  local value="$1"
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/}
  printf '"%s"' "$value"
}

write_env_line() {
  printf '%s=%s\n' "$1" "$(escape_dotenv "$2")" >> "$ROOT_DIR/.env"
}

prompt_value() {
  local prompt="$1" default="$2" value
  if [[ "$NON_INTERACTIVE" == true ]]; then
    printf '%s' "$default"
    return
  fi
  if [[ -n "$default" ]]; then
    read -r -p "$prompt [$default]: " value
    printf '%s' "${value:-$default}"
  else
    read -r -p "$prompt: " value
    printf '%s' "$value"
  fi
}

prompt_secret() {
  local prompt="$1" value
  if [[ "$NON_INTERACTIVE" == true ]]; then
    printf '%s' ""
    return
  fi
  read -r -s -p "$prompt: " value
  echo >&2
  printf '%s' "$value"
}

INSTANCE=""
DOMAIN=""
ROOT_DIR=""
PROXY_MODE=""
DB_MODE=""
DB_ENGINE="mariadb"
DB_BOOTSTRAP=""
DB_DUMP=""
TRAKOVO_IMAGE="ghcr.io/spaceypuppy/trakovo:v1.15.3"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
CLOUDFLARE_TUNNEL_TOKEN="${CLOUDFLARE_TUNNEL_TOKEN:-}"
NON_INTERACTIVE=false
EXTERNAL_DB_HOST="${EXTERNAL_DB_HOST:-}"
EXTERNAL_DB_PORT="${EXTERNAL_DB_PORT:-3306}"
EXTERNAL_DB_USER="${EXTERNAL_DB_USER:-}"
EXTERNAL_DB_PASSWORD="${EXTERNAL_DB_PASSWORD:-}"
EXTERNAL_DB_NAME="${EXTERNAL_DB_NAME:-}"
CADDY_EMAIL="${CADDY_EMAIL:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --instance) INSTANCE="${2:?--instance requires a value}"; shift 2 ;;
    --domain) DOMAIN="${2:?--domain requires a value}"; shift 2 ;;
    --root) ROOT_DIR="${2:?--root requires a path}"; shift 2 ;;
    --proxy) PROXY_MODE="${2:?--proxy requires caddy, cloudflare, or external}"; shift 2 ;;
    --db) DB_MODE="${2:?--db requires bundled or external}"; shift 2 ;;
    --db-engine) DB_ENGINE="${2:?--db-engine requires mariadb or mysql}"; shift 2 ;;
    --db-bootstrap) DB_BOOTSTRAP="${2:?--db-bootstrap requires fresh, import, or existing}"; shift 2 ;;
    --db-dump) DB_DUMP="${2:?--db-dump requires a path}"; shift 2 ;;
    --image) TRAKOVO_IMAGE="${2:?--image requires a full image reference}"; shift 2 ;;
    --admin-username) ADMIN_USERNAME="${2:?--admin-username requires a value}"; shift 2 ;;
    --admin-password) ADMIN_PASSWORD="${2:?--admin-password requires a value}"; shift 2 ;;
    --cloudflare-token) CLOUDFLARE_TUNNEL_TOKEN="${2:?--cloudflare-token requires a value}"; shift 2 ;;
    --db-host) EXTERNAL_DB_HOST="${2:?--db-host requires a value}"; shift 2 ;;
    --db-port) EXTERNAL_DB_PORT="${2:?--db-port requires a value}"; shift 2 ;;
    --db-user) EXTERNAL_DB_USER="${2:?--db-user requires a value}"; shift 2 ;;
    --db-password) EXTERNAL_DB_PASSWORD="${2:?--db-password requires a value}"; shift 2 ;;
    --db-name) EXTERNAL_DB_NAME="${2:?--db-name requires a value}"; shift 2 ;;
    --caddy-email) CADDY_EMAIL="${2:?--caddy-email requires a value}"; shift 2 ;;
    --non-interactive) NON_INTERACTIVE=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "Docker is required."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required."
command -v openssl >/dev/null 2>&1 || die "OpenSSL is required to generate secrets."
command -v curl >/dev/null 2>&1 || die "curl is required for the final health check."

INSTANCE="${INSTANCE:-$(prompt_value 'Instance name' 'dev')}"
DOMAIN="${DOMAIN:-$(prompt_value 'Public hostname' '')}"
PROXY_MODE="${PROXY_MODE:-$(prompt_value 'Ingress (caddy/cloudflare/external)' 'caddy')}"
if [[ "$PROXY_MODE" == cloudflare && -z "$CLOUDFLARE_TUNNEL_TOKEN" ]]; then
  CLOUDFLARE_TUNNEL_TOKEN="$(prompt_secret 'Cloudflare Tunnel token')"
fi
DB_MODE="${DB_MODE:-$(prompt_value 'Database (bundled/external)' 'bundled')}"
DB_BOOTSTRAP="${DB_BOOTSTRAP:-$(prompt_value 'Database bootstrap (fresh/import/existing)' 'fresh')}"

[[ "$INSTANCE" =~ ^[a-z0-9][a-z0-9-]*$ ]] || die "Instance must contain lowercase letters, numbers, and hyphens only."
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || die "Domain must be a hostname without a scheme or path."
[[ "$PROXY_MODE" =~ ^(caddy|cloudflare|external)$ ]] || die "Unsupported proxy mode: $PROXY_MODE"
[[ "$DB_MODE" =~ ^(bundled|external)$ ]] || die "Unsupported database mode: $DB_MODE"
[[ "$DB_ENGINE" =~ ^(mariadb|mysql)$ ]] || die "Unsupported database engine: $DB_ENGINE"
[[ "$DB_BOOTSTRAP" =~ ^(fresh|import|existing)$ ]] || die "Unsupported bootstrap mode: $DB_BOOTSTRAP"
[[ "$DB_BOOTSTRAP" != import || -n "$DB_DUMP" ]] || die "--db-dump is required for import mode."
[[ "$PROXY_MODE" != cloudflare || -n "$CLOUDFLARE_TUNNEL_TOKEN" ]] || die "A Cloudflare Tunnel token is required for cloudflare mode."

ROOT_DIR="${ROOT_DIR:-/opt/trakovo/$INSTANCE}"
PROJECT_NAME="trakovo-$INSTANCE"
PROXY_NETWORK="trakovo_edge"
HTTP_PORT=""

if [[ -e "$ROOT_DIR/.env" || -e "$ROOT_DIR/compose.yaml" ]]; then
  die "Instance directory already exists: $ROOT_DIR. Use its upgrade.sh or choose another --root."
fi

if [[ "$NON_INTERACTIVE" == true && -z "$ADMIN_PASSWORD" ]]; then
  die "--admin-password or an ADMIN_PASSWORD environment value is required in non-interactive mode."
fi
if [[ -z "$ADMIN_PASSWORD" ]]; then
  ADMIN_PASSWORD="$(prompt_secret 'Master admin password (leave blank to generate)')"
  if [[ -z "$ADMIN_PASSWORD" ]]; then
    ADMIN_PASSWORD="$(random_hex 20)"
    GENERATED_ADMIN_PASSWORD="$ADMIN_PASSWORD"
  fi
fi

if [[ "$DB_MODE" == bundled ]]; then
  DB_HOST=db
  DB_PORT=3306
  DB_NAME="trakovo_${INSTANCE//-/_}"
  DB_USER="trakovo"
  DB_PASSWORD="$(random_hex 24)"
  DB_ROOT_PASSWORD="$(random_hex 32)"
  DB_IMAGE="${DB_ENGINE}:"
  [[ "$DB_ENGINE" == mariadb ]] && DB_IMAGE="mariadb:11.4"
  [[ "$DB_ENGINE" == mysql ]] && DB_IMAGE="mysql:8.0"
else
  EXTERNAL_DB_HOST="${EXTERNAL_DB_HOST:-$(prompt_value 'External DB host' '')}"
  EXTERNAL_DB_PORT="${EXTERNAL_DB_PORT:-$(prompt_value 'External DB port' '3306')}"
  EXTERNAL_DB_NAME="${EXTERNAL_DB_NAME:-$(prompt_value 'External DB name' 'trakovo')}"
  EXTERNAL_DB_USER="${EXTERNAL_DB_USER:-$(prompt_value 'External DB user' 'trakovo')}"
  if [[ -z "$EXTERNAL_DB_PASSWORD" ]]; then EXTERNAL_DB_PASSWORD="$(prompt_secret 'External DB password')"; fi
  [[ -n "$EXTERNAL_DB_HOST" && -n "$EXTERNAL_DB_NAME" && -n "$EXTERNAL_DB_USER" ]] || die "External DB host, name, and user are required."
  DB_HOST="$EXTERNAL_DB_HOST"
  DB_PORT="$EXTERNAL_DB_PORT"
  DB_NAME="$EXTERNAL_DB_NAME"
  DB_USER="$EXTERNAL_DB_USER"
  DB_PASSWORD="$EXTERNAL_DB_PASSWORD"
  DB_ROOT_PASSWORD=""
  DB_IMAGE=""
fi

COOKIE_SECURE=true

mkdir -p "$ROOT_DIR/data/uploads" "$ROOT_DIR/data/backups"
chmod 700 "$ROOT_DIR/data" "$ROOT_DIR/data/uploads" "$ROOT_DIR/data/backups"
chown 1001:1001 "$ROOT_DIR/data/uploads" || die "Could not assign upload storage to container UID 1001; run the installer with sudo."
chmod 750 "$ROOT_DIR/data/uploads"
cp "$SOURCE_ROOT/deploy/docker/compose.yaml" "$ROOT_DIR/compose.yaml"
cp "$SCRIPT_DIR/backup.sh" "$ROOT_DIR/backup.sh"
cp "$SCRIPT_DIR/upgrade.sh" "$ROOT_DIR/upgrade.sh"
chmod 700 "$ROOT_DIR/backup.sh" "$ROOT_DIR/upgrade.sh"

umask 077
: > "$ROOT_DIR/.env"
write_env_line COMPOSE_PROJECT_NAME "$PROJECT_NAME"
write_env_line TRAKOVO_IMAGE "$TRAKOVO_IMAGE"
write_env_line TRAKOVO_HOSTNAME "$DOMAIN"
write_env_line TRAKOVO_PROXY_MODE "$PROXY_MODE"
write_env_line TRAKOVO_PROXY_NETWORK "$PROXY_NETWORK"
write_env_line TRAKOVO_HTTP_PORT "${HTTP_PORT:-$((3000 + RANDOM % 2000))}"
write_env_line UPLOADS_PATH "./data/uploads"
write_env_line BACKUP_PATH "./data/backups"
write_env_line DB_MODE "$DB_MODE"
write_env_line DB_IMAGE "$DB_IMAGE"
write_env_line DB_HOST "$DB_HOST"
write_env_line DB_PORT "$DB_PORT"
write_env_line DB_NAME "$DB_NAME"
write_env_line DB_USER "$DB_USER"
write_env_line DB_PASSWORD "$DB_PASSWORD"
write_env_line DB_ROOT_PASSWORD "$DB_ROOT_PASSWORD"
write_env_line DB_CONNECTION_LIMIT "5"
write_env_line DB_SLOW_QUERY_MS "250"
write_env_line ADMIN_USERNAME "$ADMIN_USERNAME"
write_env_line ADMIN_PASSWORD "$ADMIN_PASSWORD"
write_env_line ADMIN_JWT_SECRET "$(random_hex 32)"
write_env_line VENDOR_JWT_SECRET "$(random_hex 32)"
write_env_line DRIVER_JWT_SECRET "$(random_hex 32)"
write_env_line COOKIE_SECURE "$COOKIE_SECURE"
write_env_line NEXT_PUBLIC_SITE_NAME "Trakovo"
write_env_line NEXT_PUBLIC_ADMIN_NAME "Hire Manager"
write_env_line NEXT_PUBLIC_SITE_URL "https://$DOMAIN"
write_env_line NEXT_PUBLIC_MAPBOX_TOKEN ""
write_env_line DEVELOPMENT_MODE "false"
write_env_line MAINTENANCE_MODE "false"
write_env_line MAINTENANCE_PASSWORD "$(random_hex 24)"
write_env_line CRON_SECRET "$(random_hex 32)"
write_env_line SMTP_HOST ""
write_env_line SMTP_PORT "587"
write_env_line SMTP_USER ""
write_env_line SMTP_PASS ""
write_env_line SMTP_FROM ""
write_env_line SMTP_SECURE "false"
write_env_line MS_CLIENT_ID ""
write_env_line MS_CLIENT_SECRET ""
write_env_line MS_TENANT_ID ""
write_env_line GOOGLE_CLIENT_ID ""
write_env_line GOOGLE_CLIENT_SECRET ""
write_env_line VAPID_PUBLIC_KEY ""
write_env_line VAPID_PRIVATE_KEY ""
write_env_line VAPID_SUBJECT "mailto:admin@$DOMAIN"
write_env_line GITHUB_TOKEN ""
write_env_line CRAZYTEL_API_KEY ""
write_env_line CRAZYTEL_SENDER ""
write_env_line NEXT_PUBLIC_CRAZYTEL_API_KEY ""
write_env_line CLOUDFLARE_TUNNEL_TOKEN "$CLOUDFLARE_TUNNEL_TOKEN"
write_env_line CLOUDFLARED_IMAGE "cloudflare/cloudflared:latest"

cat > "$ROOT_DIR/.gitignore" <<'EOF'
.env
.upgrade.lock
data/
*.caddy
EOF
chmod 600 "$ROOT_DIR/.env"

if ! docker network inspect "$PROXY_NETWORK" >/dev/null 2>&1; then
  docker network create "$PROXY_NETWORK" >/dev/null
fi

if [[ "$PROXY_MODE" == caddy ]]; then
  PROXY_ROOT="${TRAKOVO_PROXY_ROOT:-/opt/trakovo/proxy}"
  if ! docker ps --format '{{.Names}}' | grep -qx 'trakovo-shared-caddy'; then
    if command -v ss >/dev/null 2>&1 && ss -ltn | awk '$4 ~ /:80$/ || $4 ~ /:443$/' | grep -q LISTEN; then
      die "Ports 80/443 are already in use. Use --proxy cloudflare or --proxy external, or configure the existing Caddy instance."
    fi
  fi
  mkdir -p "$PROXY_ROOT/sites"
  cp "$SOURCE_ROOT/deploy/docker/proxy-compose.yaml" "$PROXY_ROOT/compose.yaml"
  if [[ -n "$CADDY_EMAIL" ]]; then
    {
      echo '{'
      printf '  email %s\n' "$CADDY_EMAIL"
      echo '}'
      echo
      echo 'import /etc/caddy/sites/*.caddy'
    } > "$PROXY_ROOT/Caddyfile"
  else
    cp "$SOURCE_ROOT/deploy/docker/Caddyfile" "$PROXY_ROOT/Caddyfile"
  fi
  cat > "$PROXY_ROOT/.env" <<EOF
TRAKOVO_PROXY_NETWORK="$PROXY_NETWORK"
EOF
  cat > "$PROXY_ROOT/sites/$PROJECT_NAME.caddy" <<EOF
$DOMAIN {
  encode gzip
  request_body {
    max_size 20MB
  }
  reverse_proxy $PROJECT_NAME-app:3000
}
EOF
  chmod 600 "$PROXY_ROOT/.env"
  docker compose --env-file "$PROXY_ROOT/.env" -f "$PROXY_ROOT/compose.yaml" up -d
elif [[ "$PROXY_MODE" == external ]]; then
  http_port_preview="$(grep '^TRAKOVO_HTTP_PORT=' "$ROOT_DIR/.env" | cut -d= -f2 | tr -d '\"')"
  cat > "$ROOT_DIR/$PROJECT_NAME.caddy" <<EOF
$DOMAIN {
  encode gzip
  request_body {
    max_size 20MB
  }
  reverse_proxy 127.0.0.1:$http_port_preview
}
EOF
  echo "Generated reverse-proxy snippet: $ROOT_DIR/$PROJECT_NAME.caddy"
fi

compose=(docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/compose.yaml")
profiles=()
[[ "$DB_MODE" == bundled ]] && profiles+=(--profile bundled-db)
[[ "$PROXY_MODE" == cloudflare ]] && profiles+=(--profile cloudflare)

"${compose[@]}" pull app
if [[ "$DB_MODE" == bundled ]]; then "${compose[@]}" --profile bundled-db pull db; fi
if [[ "$PROXY_MODE" == cloudflare ]]; then "${compose[@]}" --profile cloudflare pull cloudflared; fi
if [[ "$DB_MODE" == bundled ]]; then "${compose[@]}" --profile bundled-db up -d db; fi

"${compose[@]}" run --rm --no-deps app node /app/tools/db.mjs wait

case "$DB_BOOTSTRAP" in
  fresh)
    "${compose[@]}" run --rm --no-deps app node /app/tools/db.mjs init
    ;;
  import)
    [[ -f "$DB_DUMP" ]] || die "Database dump not found: $DB_DUMP"
    "${compose[@]}" run --rm --no-deps app node /app/tools/db.mjs empty
    if [[ "$DB_MODE" == bundled ]]; then
      import_cmd=("${compose[@]}" exec -T db sh -c 'if command -v mariadb >/dev/null 2>&1; then exec mariadb --binary-mode=1 -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"; else exec mysql --binary-mode=1 -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"; fi')
    else
      db_client="$(command -v mariadb || command -v mysql || true)"
      [[ -n "$db_client" ]] || die "mariadb or mysql client is required for external database import."
      import_cmd=(env MYSQL_PWD="$DB_PASSWORD" "$db_client" --protocol=tcp --host "$DB_HOST" --port "$DB_PORT" --user "$DB_USER" "$DB_NAME")
    fi
    if [[ "$DB_DUMP" == *.gz ]]; then
      gzip -dc -- "$DB_DUMP" | "${import_cmd[@]}"
    else
      cat "$DB_DUMP" | "${import_cmd[@]}"
    fi
    "${compose[@]}" run --rm --no-deps app node /app/tools/db.mjs migrate
    ;;
  existing)
    "${compose[@]}" run --rm --no-deps app node /app/tools/db.mjs migrate
    ;;
esac

"${compose[@]}" "${profiles[@]}" up -d

if [[ "$PROXY_MODE" == cloudflare ]]; then
  cloudflared_compose=("${compose[@]}" --profile cloudflare)
  cloudflared_id=""
  cloudflared_state=""
  for attempt in {1..15}; do
    cloudflared_id="$("${cloudflared_compose[@]}" ps -a -q cloudflared 2>/dev/null || true)"
    if [[ -n "$cloudflared_id" ]]; then
      cloudflared_state="$(docker inspect --format '{{.State.Status}}' "$cloudflared_id" 2>/dev/null || true)"
      [[ "$cloudflared_state" == running ]] && break
    fi
    sleep 2
  done
  if [[ "$cloudflared_state" != running ]]; then
    echo "Cloudflare Tunnel connector did not remain running. Recent logs:" >&2
    "${cloudflared_compose[@]}" logs --tail=80 cloudflared >&2 || true
    die "Cloudflare Tunnel is not running. Check the token and the tunnel public-hostname service target."
  fi
  echo "Cloudflare Tunnel connector is running; confirm it is Connected in the Cloudflare dashboard."
fi

http_port="$(grep '^TRAKOVO_HTTP_PORT=' .env | cut -d= -f2 | tr -d '\"')"
health_url="http://127.0.0.1:${http_port}/api/health"
for attempt in {1..30}; do
  if curl -fsS --max-time 3 "$health_url" >/dev/null 2>&1; then break; fi
  sleep 2
done
curl -fsS --max-time 5 "$health_url" >/dev/null || die "The application did not pass its health check: $health_url"

echo
echo "Trakovo instance installed: $PROJECT_NAME"
echo "Instance directory: $ROOT_DIR"
echo "Public hostname: https://$DOMAIN"
echo "Run upgrades with: $ROOT_DIR/upgrade.sh --version vX.Y.Z"
if [[ -n "${GENERATED_ADMIN_PASSWORD:-}" ]]; then
  echo "Generated admin password (save it now): $GENERATED_ADMIN_PASSWORD"
fi
if [[ "$PROXY_MODE" == cloudflare ]]; then
  echo "Cloudflare: configure the tunnel public hostname '$DOMAIN' to service http://app:3000."
elif [[ "$PROXY_MODE" == external ]]; then
  echo "Configure your existing proxy using $ROOT_DIR/$PROJECT_NAME.caddy and proxy to 127.0.0.1:$http_port."
fi
