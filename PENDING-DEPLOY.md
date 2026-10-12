# Pending Production Deployment

## Current production version: v1.15.3 (owner confirmed 12 October 2026)

Production uses cPanel shared hosting. The owner manages installation; publishing a
GitHub release does not mean production has been upgraded. The VPS migration has not occurred.

## Current pending version: v1.18.0

## v1.18.0 — (unreleased)

- Taxi is advertised as an available service, without public Coming Soon labels.
- Choosing Taxi opens a call-to-book dialog instead of loading the online taxi flow.
- Default booking number: **0488 838 442** (`tel:0488838442`).
- Admin → Settings → Booking App → Taxi Bookings can change the number and enable the
  online app later. Online booking is off unless explicitly enabled.
- Direct taxi URLs are also guarded; public taxi submissions are rejected in phone mode.
  Vendor taxi bookings are unaffected.
- Unlaunched rideshare cards are hidden; old `/book/rideshare` URLs redirect to `/book`.

### Upgrade directly from v1.15.3 using OTA

There is no need to install v1.16.0 or v1.17.0 separately. v1.18.0 includes the v1.16
portal refresh and v1.17 customer licence-verification changes.

1. Back up the database and current application bundle, including `package.json`.
2. Apply the **one** outstanding schema change below through phpMyAdmin, before deploying.
3. Admin → Settings → Updates → Check for Updates → deploy v1.18.0, or upload
   `next-bundle-v1.18.0.zip`. The updater replaces `.next`/`package.json` and restarts Passenger.
4. Run the focused checks below. Record the live version and completion here only after
   the owner confirms installation and checks.

The taxi change uses the existing `Setting` table. No new tables, dependencies, public
assets, environment variables, or cron jobs are required. Runtime dependencies, `app.js`
and public assets are unchanged since v1.15.3; this upgrade is OTA-compatible and does
not require NPM Install or replacing root configuration.

### Required SQL carried forward from v1.17.0

Select the production database in phpMyAdmin and run this read-only preflight:

```sql
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'Booking'
  AND COLUMN_NAME = 'licence_verification_deferred';
```

If it returns **zero rows**, run this statement once:

```sql
ALTER TABLE `Booking`
  ADD COLUMN `licence_verification_deferred` BOOLEAN NOT NULL DEFAULT false
  AFTER `driver_licence_expiry`;
```

Repeat the preflight: expect one non-nullable boolean/TINYINT(1) column with default 0.
If the column already exists with this definition, do not rerun the ALTER. Stop and
inspect any differing definition or SQL error. Do not import `prisma/init.sql` over the
existing database, and do not reapply historical v1.15 billing migrations.

### Focused post-deploy checklist

- [ ] Backups verified; licence-verification column present before OTA deployment.
- [ ] v1.18.0 installed and Passenger restarted; admin login remains healthy.
- [ ] Admin → Settings → Booking App shows 0488 838 442 and online taxi bookings off.
- [ ] Taxi on `/book`, the homepage, and `/services` opens a working call dialog; no
      taxi map or location prompt appears.
- [ ] Direct `/book/taxi` and `/book/taxi/confirm` links show phone booking, not the app.
- [ ] Save a phone-number change, refresh the public page, and confirm the displayed
      number/call link changes. Restore the operational number after the check.
- [ ] Confirm public pages no longer label services Coming Soon. Google search results
      may retain old text until recrawled; request reindexing in Search Console if available.
- [ ] Submit one dry-hire booking using on-the-day licence verification; confirm the
      admin record shows it. Check an LR vehicle's required-class cancellation warning.
- [ ] Check an ordinary hire booking still accepts licence number/expiry as before.

Keep **Enable online taxi bookings** off in production until launch. It can be tested
on a non-production instance; do not briefly expose the app publicly just to test the switch.

### Rollback

The SQL is additive and compatible with v1.15.3. Keep the column if rolling back code.
Use the OTA rollback bundle for a code failure and restore the backed-up `package.json`
if necessary: the updater's rollback restores `.next`, not package metadata. Do not
drop the new column or undo billing data as an application rollback step.

### Deployment history

- v1.15.3: production version confirmed by owner on 12 October 2026; historical
  billing acceptance checks were not reverified in this release session.
- v1.16.0 and v1.17.0: releases published, not yet installed on this production instance.
- The previous audited SQL and historical checklists are preserved in
  [`docs/archive/PENDING-DEPLOY-v1.17.0.md`](docs/archive/PENDING-DEPLOY-v1.17.0.md).
