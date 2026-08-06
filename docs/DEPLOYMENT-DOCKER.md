# Docker deployment

Trakovo can run as a tagged prebuilt container image with one Compose project per
instance. Each project has its own upload directory, database volume (when using a
bundled database), environment file, backup directory, and upgrade lock.

The supported host pattern is:

```text
Internet
  -> shared Caddy (ports 80/443) OR Cloudflare Tunnel (outbound only)
  -> Trakovo app container
  -> bundled MySQL/MariaDB container OR external MySQL-compatible database
```

## Caddy or Cloudflare Tunnel?

| Choice | Strengths | Trade-offs |
|---|---|---|
| Shared Caddy | Portable, conventional VPS setup; automatic HTTPS; works with any DNS provider; easy to inspect and debug | Requires host ports 80/443; must coexist with any existing proxy; certificate issuance depends on inbound traffic reaching the VPS |
| Cloudflare Tunnel | No inbound ports; avoids conflicts with another Docker Caddy; Cloudflare edge TLS, WAF, Access, and DDoS controls; convenient when DNS is already on Cloudflare | Depends on Cloudflare and a connector token; tunnel hostname/service routes must be configured in Cloudflare; adds another container and an extra diagnostic hop |

Recommendation:

- Use **Cloudflare Tunnel for the isolated developer instance** if the existing
  Technopro deployment already owns ports 80/443. It avoids disrupting that stack and
  can be protected with Cloudflare Access before requests reach Trakovo.
- Use **shared Caddy as the default portable production option** once the VPS has one
  proxy owner. A single Caddy instance can serve many Trakovo instances through the
  shared `trakovo_edge` Docker network.

The installer supports both with `--proxy caddy` and `--proxy cloudflare`. It also has
`--proxy external` for an existing Nginx/Caddy/Traefik setup and writes a reverse-proxy
snippet without trying to take over ports 80/443.

Cloudflare DNS records still need to exist. Caddy requires the hostname's A/AAAA record
to reach the VPS and ports 80/443 to be reachable. Tunnel mode requires a Cloudflare
Tunnel public hostname configured to forward to `http://app:3000` for that instance.

The tunnel connector is given two networks: the isolated application network so it can
resolve `app:3000`, and a dedicated outbound network so it can reach Cloudflare. The
application and database remain on the isolated network and do not receive that extra
egress path.

## Publish the image

Pushing a `vX.Y.Z` tag runs `.github/workflows/container-image.yml` and publishes:

```text
ghcr.io/spaceypuppy/trakovo:vX.Y.Z
```

The workflow also publishes semver and `latest` tags. The VPS only needs Docker, Docker
Compose v2, OpenSSL, curl, and the deployment scripts; it does not build the application.
The workflow can also be run manually with an explicit image tag, which is useful for
publishing the current release after this container workflow is first merged.
For a private GHCR package, log in on the VPS with a read-only package token before
running the installer.

The same tag also runs `.github/workflows/release.yml`. It preserves the two existing
cPanel assets and adds `trakovo-docker-vX.Y.Z.zip`, containing the Dockerfile, Compose
files, installer, upgrade/backup scripts, database runner, and Docker deployment guide:

```text
trakovo-vX.Y.Z.zip          # existing full cPanel release
next-bundle-vX.Y.Z.zip     # existing admin OTA update bundle
trakovo-docker-vX.Y.Z.zip  # Docker deployment bundle
```

The Docker image is published separately to GHCR by the container-image workflow. The
Docker deployment bundle is intentionally independent of the cPanel full ZIP, so adding
it does not change the existing OTA bundle format or the next two weeks of cPanel
upgrade compatibility.

The image uses Next.js standalone output and runs `node server.js`. It does not contain
local uploads, `.env` files, or database data. `NEXT_PUBLIC_MAPBOX_TOKEN` is an optional
build-time public token; create a custom image with the Docker build argument if a
deployment needs Mapbox in the client bundle.

## First installation

Clone or copy the repository's deployment files to the VPS, then run the installer. An
interactive install prompts for the instance name, public hostname, ingress, database,
bootstrap mode, and admin password.

Example isolated developer instance using Cloudflare Tunnel and bundled MariaDB:

```bash
sudo mkdir -p /opt/trakovo-src
sudo git clone https://github.com/SpaceyPuppy/trakovo.git /opt/trakovo-src
cd /opt/trakovo-src
sudo bash deploy/scripts/install.sh \
  --instance dev \
  --domain dev.example.com \
  --proxy cloudflare \
  --cloudflare-token 'TUNNEL_TOKEN' \
  --db bundled \
  --db-engine mariadb \
  --image ghcr.io/spaceypuppy/trakovo:v1.15.3
```

For a host where the installer owns the shared proxy instead:

```bash
sudo bash deploy/scripts/install.sh \
  --instance dev \
  --domain dev.example.com \
  --proxy caddy \
  --db bundled \
  --db-engine mariadb
```

The installer creates `/opt/trakovo/dev` by default, chooses an unused localhost port
for the app, creates the shared `trakovo_edge` network, and keeps uploads in
`/opt/trakovo/dev/data/uploads`. It will refuse managed Caddy mode if another process
already owns ports 80/443; choose Tunnel or external-proxy mode in that situation.

The generated `.env` is mode `600`. Treat it and the backup copies as secrets.

## Database choices and migration

For a new isolated developer instance, MariaDB is the light default. For importing an
existing MySQL database, use MySQL 8 first when compatibility is the priority; it avoids
surprises from MySQL-specific collations or dump features. The installer supports both:

```bash
# Fresh bundled MariaDB
bash deploy/scripts/install.sh --instance dev --domain dev.example.com \
  --proxy cloudflare --cloudflare-token "$TUNNEL_TOKEN" \
  --db bundled --db-engine mariadb --db-bootstrap fresh

# Fresh bundled MySQL
bash deploy/scripts/install.sh --instance dev-mysql --domain mysql.example.com \
  --proxy caddy --db bundled --db-engine mysql --db-bootstrap fresh
```

External database mode accepts `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and
`DB_PASSWORD` interactively or through the installer options. The bundled database is
not started in that mode.

The current fresh schema remains `prisma/init.sql`. The container tooling adds a separate
`TrakovoSchemaMigration` history table and records the current schema as
`0000-baseline`; it never re-imports `init.sql` over a non-empty database. Future schema
changes must be added as ordered files in `database/migrations/`. Each applied file is
checksum-verified and the upgrade command serializes concurrent runs with a database
lock.

The existing cPanel release migration in `PENDING-DEPLOY.md` is not silently converted
into an automatic migration. If the exported database is older than the current v1.15.3
schema, apply and verify that release's SQL on a copy first, or complete the documented
legacy migration before importing it into the container instance.

## Importing the deployed instance

1. Pause production writes and export the complete production database from phpMyAdmin
   or with `mysqldump`. Include all tables and use a consistent snapshot.
2. Copy the dump to the VPS without placing it in a public web directory.
3. Run the installer with `--db-bootstrap import --db-dump /secure/path/production.sql.gz`.
   Import mode checks that the target database is empty before loading it.
4. Copy the existing `UPLOAD_DIR` contents into the new instance's
   `data/uploads` directory, preserving file names, then run
   `chown -R 1001:1001 /opt/trakovo/dev/data/uploads` so the non-root app container can
   write and serve them.
5. Verify admin login, a booking, an uploaded document/media item, email settings, and
   every integration that should remain disabled in the developer environment.

For a developer copy, use separate SMTP/API/calendar credentials or leave integrations
disabled. Do not point test traffic at the production notification mailbox or calendar.

## Upgrading an instance

Run upgrades from the instance directory, not from the admin dashboard:

```bash
sudo /opt/trakovo/dev/upgrade.sh --version v1.15.4
```

The command:

1. Takes a compressed database dump, upload archive, and environment backup.
2. Acquires a per-instance upgrade lock.
3. Changes the app to maintenance mode.
4. Pulls the selected tagged image.
5. Runs ordered, checksummed database migrations from that image.
6. Recreates the app and waits for `/api/health`.
7. Clears maintenance mode only after migration succeeds.

If a migration fails, maintenance mode remains enabled and the old backup is retained.
Fix the migration or restore the backup, then rerun the command. Use `--skip-backup` only
for a deliberate repeated test after a verified backup already exists.

Rollback is image-based: rerun the command with the previous image tag. A code rollback
does not reverse database changes; restore the database backup only when the migration's
release procedure says that is safe.

## Operations and debugging

Useful commands for one instance:

```bash
cd /opt/trakovo/dev
docker compose --env-file .env -f compose.yaml ps
docker compose --env-file .env -f compose.yaml logs --tail=200 app
docker compose --env-file .env -f compose.yaml logs --tail=200 cloudflared
docker compose --env-file .env -f compose.yaml run --rm --no-deps app node /app/tools/db.mjs status
./backup.sh
```

If `cloudflared` is running but Cloudflare reports no connector, verify the token was
created for the same tunnel and that the dashboard public-hostname service target is
exactly `http://app:3000`. The installer checks that the connector remains running and
prints its recent logs if it exits.

The app binds only to localhost. The database has no host port mapping. Do not mount the
Docker socket into Trakovo or grant a debugging user Docker access unless that user is
trusted with the entire VPS. For safe bug challenges, provide sanitized application logs,
the image tag, migration status, and a disposable developer database rather than
production `.env` files or customer uploads.
