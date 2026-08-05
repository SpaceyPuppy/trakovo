# Trakovo Deployment

Last reviewed: 19 July 2026

This is the canonical deployment overview. The detailed cPanel procedure is
[`DEPLOYMENT-CPANEL.md`](../DEPLOYMENT-CPANEL.md). Release-specific SQL, configuration,
ordering, and verification are controlled by [`PENDING-DEPLOY.md`](../PENDING-DEPLOY.md).

## Current release gate

The current repository release is v1.15.3. Confirm the actual live version before changing
production and follow the release-specific checks in `PENDING-DEPLOY.md`.

## Sources of truth

| Question | Source |
|---|---|
| What is live and what is pending? | `docs/PRODUCT-STATUS.md` |
| What must be done for this release? | `PENDING-DEPLOY.md` |
| How is cPanel/Passenger installed, updated, and rolled back? | `DEPLOYMENT-CPANEL.md` |
| How are VPS container instances installed and upgraded? | `DEPLOYMENT-DOCKER.md` |
| What should a fresh database contain? | `prisma/init.sql` |
| What version is the source/package? | `package.json` |

If these disagree, stop the deployment and resolve the mismatch before changing production.

## Release sequence

1. Confirm the intended version and read `PENDING-DEPLOY.md` end to end.
2. Validate locally with `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
3. Build the full release and OTA bundles with `make-zip.ps1`; verify their version and
   contents.
4. Announce the maintenance window and pause writes when the release SQL requires it.
5. Take and verify recoverable backups of the database, uploads, environment configuration,
   and current application bundle.
6. Apply the ordered production SQL through phpMyAdmin exactly as documented, then run its
   verification queries.
7. Deploy the full release ZIP or the approved OTA `.next` bundle. Run dependency installation
   when required and restart Passenger.
8. Complete authentication, booking, communications, portal, billing, and integration smoke
   tests listed for the release.
9. Resume writes only after the checks pass. Record the live version and clear only the
   completed items from `PENDING-DEPLOY.md`.

The application does not run migrations automatically. `prisma/init.sql` creates a fresh
schema and must not be executed over an existing production database.

## Deployment methods

### Full release ZIP

Use for fresh installs, dependency or static-asset changes, recovery, and any release where a
complete application replacement is safer. This is the most predictable cPanel path.

### OTA bundle

Use only after its release prerequisites are complete. The admin updater swaps the prepared
`.next` output, retains a rollback bundle, and restarts Passenger. An OTA code rollback does
not automatically reverse SQL or data changes.

## Rollback rule

Decide rollback before the maintenance window. If a failure is code-only and the schema is
backward-compatible, use the previous application bundle or OTA rollback. If the release
changed data or made the schema incompatible, follow the release-specific rollback plan and
restore the verified database backup where required. Never improvise destructive reverse SQL
on production.

## After deployment

- Confirm the production version from the running application, not only from a local tag.
- Confirm Passenger restarted and no old process is serving stale code.
- Verify uploads still resolve from persistent storage.
- Check server/application logs and external-provider results without exposing secrets.
- Update `docs/PRODUCT-STATUS.md`, `PENDING-DEPLOY.md`, release notes, and any canonical context
  file that intentionally tracks the live version.

