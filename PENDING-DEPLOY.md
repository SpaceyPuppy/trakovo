# Pending Production Deployment

## Last confirmed production version: v1.19.0

Owner confirmed on 26 October 2026: full package checksum matched, backups completed,
Node app stopped for replacement, SQL preflight and showcase columns passed, NPM install
succeeded, Node 24.22.1 and runtime packages matched the release. After starting, homepage,
new navigation, Special Occasions and admin login all passed. Installation is owner-managed.
The earlier installation checklist is archived in docs/archive/PENDING-DEPLOY-v1.19.0.md;
its completed SQL and framework installation steps must not be repeated.

## Current pending version: v1.20.0

## v1.20.0 — (unreleased)

Enquiry-only public vehicles, editable fleet categories, homepage category tiles and
hover/touch occasion navigation. Use the full trakovo-v1.20.0.zip package through cPanel,
not Admin OTA upload. No dependency, Node, environment-variable or cron changes are added
by this release. Existing patched Node 24.22.1+ (24.x) and dependencies are retained.

### Required database changes — before the new build starts

Back up the current production database and application first. In phpMyAdmin, use the
actual production database name explicitly (currently ckbservi_trakovo). Read-only checks:

```sql
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'ckbservi_trakovo'
  AND TABLE_NAME = 'Vehicle' AND COLUMN_NAME = 'enquiry_only';

SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'ckbservi_trakovo'
  AND TABLE_NAME IN ('FleetCategory', 'VehicleFleetCategory');
```

- [ ] If enquiry_only is absent, select the production database explicitly with
      USE `ckbservi_trakovo`; then run database/migrations/0003-v1.20.0-enquiry-only-vehicles.sql
      once. Expected column: non-nullable tinyint(1), default 0.
- [ ] If BOTH category tables are absent, run USE `ckbservi_trakovo`; followed by
      database/migrations/0004-v1.20.0-fleet-categories.sql once. This creates the category
      and vehicle-assignment tables, foreign keys and a default Bus category linked to
      the Buses homepage tile. No existing vehicles are automatically classified.
- [ ] Repeat the preflight and inspect table definitions/seed. If either table already
      exists, inspect both definitions and existing data; do not rerun CREATE or seed SQL.
      Do not import prisma/init.sql or reapply the v1.17/v1.19 migrations.

### Install — owner-managed cPanel

1. Back up the database, complete app, private configuration and external uploads.
2. Verify the published full package checksum. Stop the Node app in cPanel.
3. Apply only the absent schema changes above before starting the new application.
4. Show hidden files in File Manager. Move the old .next to a backup outside the app
   root, then extract the full ZIP directly into /home/ckbservi/trakovo. Avoid nesting
   or merging old .next chunks. Preserve private config, uploads and the node_modules link.
5. Keep Node 24.22.1+ (24.x), Production mode and startup file app.js. Run NPM Install
   against the supplied package.json and package-lock.json. No server build is required.
   Terminal alternative: activate the exact cPanel environment, cd to the app root,
   verify node --version, then npm install --omit=dev. Do not run npm ci against the
   cPanel-managed node_modules link.
6. Start the app after SQL, files and installation succeed. Inspect startup logs.

### Configure and verify after installation

- [ ] Admin reports v1.20.0. Confirm login, normal booking/calendar flow and uploaded media.
- [ ] Admin -> Vehicles -> Fleet Categories: Bus exists (not Bus / Coach). Rename/add/remove
      categories and choose their homepage group. Chauffeur Only and Self-Drive Available
      remain built-in, independent filters. Removing a category removes its assignments,
      never the vehicles; an unassigned/deleted category no longer affects ordering.
- [ ] Assign Bus and any other categories in each vehicle editor. Categories are optional
      and multiple selections are allowed. Existing assignments start empty.
- [ ] Homepage always shows Buses, Chauffeured Vehicles and Special Occasion Vehicles.
      Each opens the FULL public fleet with matching vehicles first. Other vehicles keep
      their relative order. Fleet category chips filter by assignment. Unknown query
      values fall back to the ordinary list. Bus membership uses explicit categories.
- [ ] Prefer for homepage category photo reuses the former Feature on homepage switch:
      choose an eligible matching vehicle image; otherwise a matching photo or category
      illustration is used. Inactive/public-hidden vehicles never supply photos.
- [ ] Enable Enquiry Only on a public active vehicle, save and reopen to verify persistence.
      Homepage/fleet/mobile vehicle actions say Enquire. /vehicles/[slug], /book/hire/[slug]
      and the old /book/[slug] redirect retain vehicle details and show the shared event
      form with the vehicle preselected, with no booking availability calendar.
- [ ] Event-page ?vehicle= links also preselect active public enquiry-only vehicles even
      without Show on Special Occasions. That showcase switch remains independent.
- [ ] Submit one real event enquiry and confirm preferred vehicle/event details in
      Admin -> Enquiries -> Contact Enquiries and the notification email. Remove the test
      enquiry through Admin. Local tests do not verify production mail or database delivery.
- [ ] A stale standard booking submission for an enquiry-only vehicle is rejected, including
      the standard form's enquiry fallback. Staff/vendor booking permissions are unchanged.
      Toggle Enquiry Only off and verify the normal flow returns.
- [ ] Desktop: hover opens occasion links, leaving closes, title click goes to page top.
      Touch: first tap opens, second tap follows the title link. Test both wide touch layouts
      and the mobile hamburger menu. Check submenu links, outside tap, Escape and keyboard.
- [ ] Check vendor/driver login and a normal hire enquiry/booking, retained from the v1.19
      full post-deploy checklist. Verify push notifications after the owner's VAPID rotation;
      old browser subscriptions may need renewal. No production mail/push test was performed
      during development.

### Remaining host/security follow-up — separate from v1.20 feature installation

- Owner confirmed: production DB_PASSWORD and ADMIN_JWT_SECRET differed from historical
  files; Microsoft client secret differed; vendor JWT, admin password, maintenance password
  and VAPID keys were changed. All portal secrets were reported configured in cPanel.
  No secret values are recorded here. The absence of a matching value is not a host audit.
- [ ] Mapbox token rotation/restriction remains owner-planned; check any SMTP/other reused keys.
- [ ] Historical .env/.env.local remain in Git history. Owner requested cleanup guidance;
      history has not been rewritten. Confirm repository visibility and plan any coordinated
      history purge separately from this installation. Existing private clones remain sensitive.
- [ ] Owner checked PHP 8.2.35. Provider confirmation is still needed for other installed PHP
      variants/internal cPanel PHP, CVE-2026-115560 precaution and current CloudLinux/cPanel/
      Passenger patches/restarts in SECURITY-REVIEW-2026-10-26.md. Do not mark host security
      fully verified from the selected PHP version or the Trakovo ZIP alone.

### Rollback

Stop the app and restore the matching v1.19.0 application, package manifests, private
configuration and dependency environment from backup. Keep patched Node/PHP and the new
additive column/tables in place; no data deletion is required for application rollback.
Restart and check login and normal booking. Leave uploads and unrelated booking/billing
records intact. Record the actual version/date and completed checks after owner confirmation.
