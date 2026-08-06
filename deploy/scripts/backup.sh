#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${INSTANCE_ROOT:-$SCRIPT_ROOT}"
[[ -f "$ROOT_DIR/compose.yaml" ]] || ROOT_DIR="$(cd "$SCRIPT_ROOT/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env || ! -f compose.yaml ]]; then
  echo "This directory is not a Trakovo container instance: $ROOT_DIR" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${BACKUP_PATH:-$ROOT_DIR/data/backups}/$timestamp"
uploads_path="${UPLOADS_PATH:-$ROOT_DIR/data/uploads}"
[[ "$uploads_path" = /* ]] || uploads_path="$ROOT_DIR/$uploads_path"

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

compose=(docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/compose.yaml")

if [[ "${DB_MODE:-bundled}" == "bundled" ]]; then
  "${compose[@]}" --profile bundled-db up -d db >/dev/null
  "${compose[@]}" --profile bundled-db exec -T db sh -c \
    'if command -v mariadb-dump >/dev/null 2>&1; then
       exec mariadb-dump --single-transaction --routines --triggers --hex-blob -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"
     elif command -v mysqldump >/dev/null 2>&1; then
       exec mysqldump --single-transaction --routines --triggers --hex-blob -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"
     else
       echo "Neither mariadb-dump nor mysqldump is available in the database container." >&2
       exit 127
     fi' \
    | gzip -c > "$backup_dir/database.sql.gz"
else
  dump_command="$(command -v mariadb-dump || command -v mysqldump || true)"
  [[ -n "$dump_command" ]] || {
    echo "mariadb-dump or mysqldump is required for external database backups." >&2
    exit 1
  }
  MYSQL_PWD="$DB_PASSWORD" "$dump_command" \
    --single-transaction --routines --triggers --hex-blob \
    --host "$DB_HOST" --port "${DB_PORT:-3306}" --user "$DB_USER" "$DB_NAME" \
    | gzip -c > "$backup_dir/database.sql.gz"
fi

tar -czf "$backup_dir/uploads.tar.gz" -C "$uploads_path" .
cp .env "$backup_dir/instance.env"
chmod 600 "$backup_dir/instance.env"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$backup_dir" && sha256sum database.sql.gz uploads.tar.gz instance.env > SHA256SUMS)
fi

echo "Backup created: $backup_dir"
