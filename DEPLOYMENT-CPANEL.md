# Trakovo cPanel Deployment Guide

Trakovo runs on Next.js through CloudLinux/Phusion Passenger and connects directly to
MySQL with `mysql2`. The application does **not** use Prisma or any database engine
binary at runtime. The `prisma/` directory is retained only as the location of the SQL
schema and historical reference files.

This guide covers fresh installations, full release ZIP deployments, and the smaller
OTA bundle available under **Admin → Settings → Updates**.

## Deployment rules at a glance

| Change | Full release ZIP | OTA bundle | Other required action |
|---|---:|---:|---|
| First installation | Yes | No | Import `prisma/init.sql`, configure environment, run NPM Install |
| Compiled application code only | Optional | Yes | Apply any pending SQL before clicking Deploy |
| `public/`, `app.js`, or root configuration | Yes | No | Restart Passenger |
| Dependencies or lockfile | Yes | No | Run NPM Install before restart |
| Database schema | Either delivery method | Either delivery method | Apply upgrade SQL manually before the new build restarts |
| Environment variables | No | No | Change them in cPanel and restart |

An OTA bundle contains only `.next/` and `package.json`. It does not install packages,
copy public assets, apply SQL, change cPanel environment variables, or back up uploads.

## Prerequisites

- cPanel with **Setup Node.js App**, MySQL, and phpMyAdmin.
- A cPanel Node.js version satisfying `package.json` (`>=18.17.0`). Use the same major
  Node.js version locally and on the server when practical.
- A local development machine with Node.js, npm, Git, and PowerShell for
  `make-zip.ps1`.
- An application domain with end-to-end HTTPS for production use.
- A current database backup before every upgrade that changes SQL.

## Prepare and verify a release locally

Read `PENDING-DEPLOY.md` before building. It is the release-specific source of truth for
upgrade SQL, new environment variables, cron changes, and post-deployment checks.

Values whose names start with `NEXT_PUBLIC_` can be embedded into browser JavaScript by
Next.js. Set the intended production public values in the local build environment as well
as in cPanel, and never place a secret in a `NEXT_PUBLIC_` variable. A cPanel-only change
to an embedded public value requires a new build.

For a clean checkout whose lockfile is already correct:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Use `npm install` instead of `npm ci` only when intentionally adding or updating
dependencies. A production build must leave `.next/BUILD_ID` present.

Create both deployment artifacts from PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File "make-zip.ps1"
```

The script reads `version`/`build_label` from `package.json` and produces:

- `trakovo-vX.X.X.zip` — full deployment files, including `.next`, `src`, `public`,
  `prisma`, runtime configuration, and package manifests.
- `next-bundle-vX.X.X.zip` — `.next` plus `package.json` for the OTA updater.

Neither artifact contains production secrets or persistent uploads.

## Fresh installation

### 1. Create the MySQL database

In **cPanel → MySQL Databases**:

1. Create a database.
2. Create a dedicated database user with a strong unique password.
3. Grant that user all required privileges on the Trakovo database.
4. Record the cPanel-prefixed database and user names exactly.

In phpMyAdmin, select the new database and import `prisma/init.sql` using UTF-8. This
file is for a fresh database. Do not repeatedly import the full file over a production
database as an upgrade mechanism.

There is no migration runner at application startup. A successful NPM install or
Passenger restart does not create or alter database tables.

### 2. Create persistent upload storage

Create an upload directory outside the application root so a deployment cannot replace
customer documents or media:

```bash
mkdir -p "$HOME/trakovo-uploads"
chmod 750 "$HOME/trakovo-uploads"
```

The Passenger application must run as an account that can read and write this directory.
Use the least-permissive mode supported by the host; do not use `chmod 777`.

### 3. Create the Node.js application

In **cPanel → Setup Node.js App**, create an application with values similar to:

| Field | Value |
|---|---|
| Node.js version | A supported version `>=18.17.0` |
| Application mode | `production` |
| Application root | `trakovo` or the chosen directory under the account home |
| Application URL | The production domain/subdomain |
| Startup file | `app.js` |

Passenger supplies `PORT`; do not hard-code a public port in cPanel.

### 4. Upload the full release

Upload `trakovo-vX.X.X.zip` to the application root and extract it there. Confirm these
paths exist afterward:

```text
app.js
package.json
package-lock.json
.next/BUILD_ID
public/
prisma/init.sql
```

Do not upload `.env`, `.env.local`, `.git`, a local `node_modules`, or a local `uploads`
directory. Production secrets belong in the cPanel environment-variable UI.

### 5. Install runtime dependencies

Use **Run NPM Install** in cPanel after the files are extracted. cPanel commonly manages
`node_modules` through its Node virtual environment, so its button is the safest way to
create or repair the link.

If the host instructs you to use Terminal, activate the exact virtual-environment command
shown by cPanel, change to the application root, and run:

```bash
npm install --omit=dev
```

Do not upload platform-specific `node_modules`. Do not run any Prisma generation command;
there is no Prisma runtime dependency. Avoid `npm ci` on the server unless the hosting
provider confirms that it will not remove cPanel's managed `node_modules` link.

Run NPM Install again whenever `package.json` or `package-lock.json` changes.

### 6. Configure environment variables

Set variables in **Setup Node.js App → Environment Variables**. Use `.env.example` as the
complete non-secret reference.

Required core settings:

| Key | Purpose |
|---|---|
| `NODE_ENV=production` | Production Next.js behavior |
| `DB_HOST` | MySQL host, commonly `localhost` |
| `DB_PORT` | MySQL port, normally `3306` |
| `DB_USER` | Dedicated MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | MySQL database name |
| `ADMIN_USERNAME` | Master administrator username |
| `ADMIN_PASSWORD` | Master administrator password |
| `ADMIN_JWT_SECRET` | Long random admin signing secret |
| `VENDOR_JWT_SECRET` | Separate long random vendor signing secret |
| `DRIVER_JWT_SECRET` | Separate long random driver signing secret |
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS site URL |
| `UPLOAD_DIR` | Absolute persistent upload path |

Recommended operational settings:

| Key | Notes |
|---|---|
| `COOKIE_SECURE=true` | Use for production HTTPS. Set false only for deliberate HTTP development/testing. |
| `DB_CONNECTION_LIMIT` | Optional pool limit; defaults to `5` and is capped by the app at `20`. |
| `DB_SLOW_QUERY_MS` | Optional slow-query threshold; defaults to `250`. |
| `CRON_SECRET` | Protects scheduled email-sequence requests. |
| `GITHUB_TOKEN` | Optional for GitHub release checks/downloads and bug reports. |

Optional integrations include SMTP, Microsoft 365, Mapbox, VAPID web push, branding,
and maintenance-mode settings. Keep signing secrets different from one another.

For production, terminate TLS end to end. If Cloudflare is used, prefer **Full (strict)**
with a valid origin certificate rather than Flexible SSL. Login and customer data should
not traverse the origin connection over plain HTTP.

### 7. Permissions and first start

Application files must be readable by the cPanel account. If extraction produced bad
permissions, repair only the application files:

```bash
find "$HOME/trakovo/.next" -type d -exec chmod 755 {} +
find "$HOME/trakovo/.next" -type f -exec chmod 644 {} +
mkdir -p "$HOME/trakovo/tmp"
```

Adjust the root path to match the configured application. Do not recursively chmod the
external upload directory or cPanel's managed Node environment without checking ownership.

Click **Restart** in Setup Node.js App, or use:

```bash
touch "$HOME/trakovo/tmp/restart.txt"
```

Then verify:

1. The public home page loads over HTTPS.
2. Admin login works.
3. A booking list and booking detail page can read from MySQL.
4. An upload can be written and served back.
5. The displayed app version and `.next/BUILD_ID` match the intended release.
6. Passenger/application logs contain no missing-table, missing-module, or connection errors.

## Upgrade with the full release ZIP

Use the full ZIP for a first install, dependency changes, public assets, startup/config
changes, or whenever the OTA limitations are unsuitable.

1. Back up the MySQL database and confirm the backup can be downloaded.
2. Confirm `UPLOAD_DIR` points outside the application root; back up irreplaceable uploads.
3. Review every item in `PENDING-DEPLOY.md`.
4. If SQL is pending, apply the upgrade SQL in phpMyAdmin **before restarting the new code**.
   Use maintenance mode for changes that are not backward compatible with the running build.
5. Upload and extract `trakovo-vX.X.X.zip` over the application root. Do not remove the
   cPanel-managed `node_modules` link or the external uploads directory.
6. If package manifests changed, run **Run NPM Install**.
7. Confirm `.next/BUILD_ID`, permissions, and environment changes.
8. Restart Passenger.
9. Run the release-specific checks in `PENDING-DEPLOY.md`.

A full ZIP extraction does not automatically create a `.next.backup`. Retain the previous
full artifact and a database backup until verification is complete.

## Upgrade with the OTA bundle

Use OTA only when `.next` plus the version in `package.json` is a complete representation
of the release. Changes to `public/`, dependencies, startup files, or other root assets
require a full deployment.

Before starting OTA:

1. Back up MySQL.
2. Read `PENDING-DEPLOY.md`.
3. Apply all required upgrade SQL and environment changes first. The OTA action restarts
   Passenger automatically, so applying SQL afterward creates an avoidable failure window.
4. Confirm dependencies and public assets are unchanged.

There are two OTA paths under **Admin → Settings → Updates**:

- **Check for Updates → Pull & Deploy** downloads the `next-bundle-*.zip` asset from the
  latest GitHub release in `SpaceyPuppy/trakovo`. `GITHUB_TOKEN` is optional for a public
  release and useful for authenticated access/rate limits.
- **Manual Deploy** uploads a locally generated `next-bundle-vX.X.X.zip` when the server
  cannot reach GitHub.

Do not upload the full `trakovo-vX.X.X.zip` to the OTA form.

The updater:

1. Extracts into a temporary directory.
2. requires `.next/BUILD_ID`.
3. copies bundled `package.json` into the app root.
4. replaces the single previous `.next.backup` with the current `.next`.
5. installs the new `.next`, repairs its read permissions, and touches `tmp/restart.txt`.
6. restores the previous `.next` automatically if the swap itself fails.

After the restart, refresh the Updates page, verify the build/version, and complete the
same smoke tests used for a full deployment.

## Rollback

### OTA rollback

The Updates page can restore the one `.next.backup` retained by the most recent successful
OTA deployment. Each new OTA deployment replaces that backup, and a successful rollback
consumes it.

This is a **compiled-build rollback only**:

- It restores `.next` and restarts Passenger.
- It does not roll back MySQL schema/data, environment variables, dependencies, public files,
  uploads, or other root files.
- The current implementation does not restore the previous `package.json`, so the displayed
  version can remain newer than the restored build.

If a release changed anything beyond `.next`, perform a full rollback using the previous
release artifact and restore the database only when the release's rollback procedure says
that is safe. Never improvise destructive reverse SQL on production data.

### Full-deployment rollback

1. Enable maintenance mode if the current app is unsafe to serve.
2. Restore the previous full release files.
3. Run NPM Install if the dependency set changed.
4. Follow the release-specific database rollback procedure, if one exists.
5. Restart Passenger and repeat all smoke tests.

## Persistent data and backups

- **MySQL** contains bookings, vehicles, vendors, settings, invoices, payments, and audit
  records. Export it before schema changes and include it in regular cPanel backups.
- **`UPLOAD_DIR`** contains uploaded documents and media. Keep it outside the application
  root and back it up independently.
- **OAuth tokens and application settings** may be stored in MySQL; a file-only rollback
  does not restore them.
- **`.next.backup`** is only a convenience for one OTA build, not a disaster-recovery backup.

## Publishing GitHub release assets

After the version, changelog, tests, commit, and push are complete, publish both artifacts
against the matching tag. For example:

```bash
git tag vX.X.X
git push origin vX.X.X
gh release create vX.X.X trakovo-vX.X.X.zip next-bundle-vX.X.X.zip --title "vX.X.X" --notes-file RELEASE-NOTES.md
```

Use the actual release-notes source chosen for the release. The OTA checker compares the
GitHub tag without its leading `v` to `package.json.version` and looks for an asset whose
name starts with `next-bundle-` and ends in `.zip`.

## Troubleshooting

### 503 Service Unavailable or Passenger will not start

- Open the cPanel application/Passenger log and use the first startup error, not only the 503.
- Confirm the configured startup file is `app.js` and the selected Node version satisfies
  `package.json`.
- Confirm `.next/BUILD_ID` exists and is readable.
- Run NPM Install if a module is missing or the cPanel `node_modules` link is absent.
- Confirm all required environment variables are configured without printing secret values.
- Restart from Setup Node.js App or touch `tmp/restart.txt` after correcting the cause.

### Database connection errors

- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, and the user's database privileges.
- Update `DB_PASSWORD` through cPanel rather than echoing it into terminal output.
- Confirm the database server accepts connections from the application account.
- Trakovo reads the five `DB_*` connection settings rather than a single connection string.

### Missing table or unknown column

- Stop retrying the failing action and compare the server schema with the pending release SQL.
- Apply the required upgrade statements from `PENDING-DEPLOY.md` through phpMyAdmin.
- Import `prisma/init.sql` only for a genuinely fresh database.
- Restart only after the schema expected by the build is present.

### Cannot find module

- Run **Run NPM Install** after extracting the full release.
- Confirm `package.json` and `package-lock.json` came from the same release.
- If the failure followed OTA and a dependency changed, deploy the full ZIP and run NPM Install.
- There is no Prisma client or query-engine binary to upload or generate.

### OTA bundle rejected or update check fails

- Confirm the selected file is `next-bundle-vX.X.X.zip`, not the full ZIP.
- Inspect the archive: it must contain `.next/BUILD_ID` at the archive root.
- Check free disk space and write access to the app root and system temporary directory.
- If GitHub is unreachable or rate-limited, configure `GITHUB_TOKEN` or use Manual Deploy.

### New images or static assets are missing after OTA

Files in `public/` are not part of the OTA bundle. Perform a full release deployment.

### Uploads fail or disappear

- Confirm `UPLOAD_DIR` is an absolute path outside the application root.
- Confirm the directory exists and is writable by the cPanel application owner.
- Check disk quota and filename/path errors in the application log.
- Do not fix this with world-writable permissions.

### Login cookie is not retained

- Use HTTPS end to end and set `COOKIE_SECURE=true` in production.
- Check domain/proxy configuration and server time.
- Use `COOKIE_SECURE=false` only for intentional HTTP development/testing.

## Files not used for this cPanel flow

- `ecosystem.config.js` and `nginx.conf.example` target VPS-style deployments.
- `deploy-cpanel.sh` is a separate Git-remote staging workflow and is not part of the ZIP/OTA
  procedure above.
- `prisma/schema.prisma` is historical reference only; it is not generated or loaded at runtime.
