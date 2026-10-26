# Pending Production Deployment

## Last confirmed working production version: v1.19.0

Owner confirmed on 26 October 2026: full package checksum matched, backups completed,
Node app stopped for replacement, SQL preflight and showcase columns passed, NPM install
succeeded, Node 24.22.1 and runtime packages matched the release. After starting, homepage,
new navigation, Special Occasions and admin login all passed. Installation is owner-managed.
The earlier installation checklist is archived in docs/archive/PENDING-DEPLOY-v1.19.0.md;
its completed SQL and framework installation steps must not be repeated.

Owner subsequently reported a manual v1.20.0 update with both vehicle lists empty.
Owner's phpMyAdmin screenshot subsequently confirmed MySQL #1071 when creating
VehicleFleetCategory: the composite utf8mb4 key can require 1,528 bytes, exceeding the
reported 1,000-byte limit. This is a migration compatibility defect. Check Vehicle and
FleetCategory engines/definitions before choosing the repair; the read-only results
have been requested. Do not drop existing tables or rerun the whole migration.
The enquiry_only column and Bus seed status still need confirmation. Production
v1.20.0 is not fully verified until schema checks and fleet visibility pass.

## Current pending version: v1.20.0

## v1.20.0 — released 26 October 2026 (production deployment pending)

[GitHub release](https://github.com/SpaceyPuppy/trakovo/releases/tag/v1.20.0) published
after PR #16 passed Linux checks and merged. Release and container workflows passed.
The downloaded full cPanel asset was verified: 4,668,675 bytes, 1,366 ZIP entries,
required build/schema/docs present, zero unsafe entries or preview hooks, and no
occurrences of the six checked private credential values. SHA-256:
`fbf5cf4023225234924fca91126e4e8f67b249a4c891c216c43e74a0a56081f3`.
An OTA asset was subsequently added on 26 October at the owner's request. The original
full package, Docker bundle and tag are unchanged. OTA is now the default for future
compatible releases; see DEPLOYMENT-CPANEL.md for the full-install-only exceptions.

OTA asset: `next-bundle-v1.20.0.zip` (4,089,390 bytes; 1,030 entries).
SHA-256: `3132c3367630a9ebf04dc1727deb3a52dcf5d82403686cf0ee39fdc70f8ef73d`.
The downloaded published OTA checksum matches. It uses byte-identical compiled files
and BUILD_ID from the published Linux full package, is accepted by the existing OTA
validator, and passed the six-value private credential scan. Comparison with v1.19.0
confirmed unchanged dependency locks (apart from root version labels), engines, scripts,
startup/configuration and public assets. The only manifest changes are compatible OTA
deployment metadata. SQL files 0003 and 0004 are also separate release downloads.

Validation: 28 focused tests, TypeScript, Windows/Linux production builds, dependency
audit (zero known vulnerabilities), and packaging checks passed. Lint has no errors
and 15 existing/style warnings. Isolated browser checks covered desktop/mobile forms,
preselection/local submission, normal booking calendars, category creation/assignment,
fleet filtering/priority, hover/Escape and mobile first/second interaction navigation.
Changing Enquiry Only with the keyboard, saving, and restoring standard booking was
also checked in the in-memory preview. Real SQL/mail/push delivery remains an owner
post-deployment check. Publication has not changed the production installation.
The packaged guide predates this publication record; its installation steps still apply.

Enquiry-only public vehicles, editable fleet categories, homepage category tiles and
hover/touch occasion navigation. Use the OTA bundle from the fully installed v1.19.0
baseline after applying the required SQL; the full ZIP is an alternative cPanel install.
No dependency, Node, environment-variable or cron changes are added
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

### Install — OTA from v1.19.0 (preferred)

1. Confirm the installed Node/dependencies are the verified v1.19.0 baseline. This OTA
   is not suitable for a server still on v1.18.x or earlier; complete the full v1.19.0
   platform upgrade first. Minimum-version/SQL manifest fields are informational to
   older installed updaters and do not substitute for these manual checks.
2. Back up the database, current .next and package.json. Apply only absent SQL as above
   while the old build is running, before swapping the build. Do not import init.sql.
3. Download next-bundle-v1.20.0.zip from the release and verify its checksum above.
   In Admin -> Settings -> Updates, use Manual Deploy if GitHub checking/downloading
   still says Fetch failed. Upload only the next-bundle ZIP, then Deploy. The existing
   updater backs up .next, sets build file/directory permissions and restarts Passenger.
4. Alternatively use Pull & Deploy once server-to-GitHub connectivity works. Publishing
   the asset does not diagnose or fix the earlier Fetch failed connection error.
5. Verify version, fleet listings and the feature checks below after restart. The OTA
   does not create SQL tables, update dependencies, copy public files or alter host config.
   If v1.20.0 was already manually installed, resolve missing SQL/permissions before
   deciding whether another build deployment is needed.

### Install — full-package cPanel alternative

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
      Chauffeured defaults to ordinary non-bus/non-event vehicles with a chauffeured hire
      mode, or categories explicitly mapped to that group. Special Occasion matches
      Show on Special Occasions, Enquiry Only or categories mapped to its group.
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
For an OTA-only rollback on the verified dependency baseline, restore the previous .next
and its matching package.json. Existing one-click rollback restores .next only. Leave the
additive schema in place and do not remove category assignments to roll back application code.
