# Pending Production Deployment

## Current pending version: v1.20.1

## v1.20.1 — (unreleased)

The four main service buttons across desktop/mobile website layouts and the booking
app now read Self-Drive Buses, Chauffeured Hire, Special Occasions, Taxi, in that order.
The first two display only vehicles in their assigned categories. Configure each under
Admin -> Vehicles -> Fleet Categories -> Service buttons. The other buttons open their
dedicated pages, retaining the existing taxi online/phone booking setting.

The built-in Chauffeur Only filter/badge is removed. Self-Drive Available remains a
filter and vehicles with self-drive enabled retain a green Self-Drive badge. Existing
hire modes and prices still control available booking options.

### Production state and database prerequisites

The owner manually installed v1.20.0 and reported both vehicle lists empty. Screenshots
confirmed Vehicle was InnoDB, FleetCategory was MyISAM, and VehicleFleetCategory was
absent after #1071 (composite index exceeded MyISAM's 1,000-byte limit). The owner then
confirmed all three repair statements succeeded: convert FleetCategory to InnoDB,
create VehicleFleetCategory as InnoDB/DYNAMIC with both cascading foreign keys, and
add Bus only if absent. **That repair is complete; do not repeat it on this server.**
Fleet visibility and real enquiry delivery still need explicit post-deployment checks.

- No new schema, environment variables, dependencies or cron jobs are required for
  v1.20.1 on this repaired v1.20.0 installation. Button assignments use existing Setting.
- For another cPanel installation missing the v1.20 schema, inspect the actual database
  first. Apply 0003 only if Vehicle.enquiry_only is absent. Use
  database/migrations/0005-v1.20.0-category-engine-repair.sql for absent/partially created
  category tables after confirming Vehicle is InnoDB and id uses utf8mb4_unicode_ci.
  Do not rerun 0004 on cPanel; it is preserved unchanged because container deployments
  track applied migration checksums. Never import init.sql over existing production.
- The repair script explicitly selects InnoDB for new category tables, preserves
  existing categories/assignments, and does not replace a pre-existing Bus category.
  Fresh-install Vehicle/category definitions now explicitly use InnoDB too.
- The script does not retrofit missing foreign keys onto an existing nonstandard
  VehicleFleetCategory table. Inspect such a table separately before proceeding.
- Previous publication evidence and installation context are archived in
  docs/archive/PENDING-DEPLOY-v1.20.0.md. Its repair-waiting notes are historical.

### OTA installation — owner performed

1. Back up the database, current .next and package.json. Confirm the existing v1.19.0+
   Node 24.22.1+ (24.x) runtime/dependencies and the completed v1.20 category repair.
2. Download next-bundle-v1.20.1.zip from the GitHub release and verify its published
   SHA-256. Use Admin -> Settings -> Updates -> Manual Deploy if Fetch failed persists;
   otherwise use Pull & Deploy. Upload only the next-bundle ZIP to the OTA page.
3. The updater swaps the compiled build and package.json, fixes build permissions and
   restarts Passenger. No NPM installation or server build is needed for this update.
4. Confirm the application reports v1.20.1 and perform the checks below. Publication
   does not install anything on production. The earlier GitHub Fetch failed connection
   issue remains unverified; publishing an asset does not establish connectivity.

### Configure and verify

- [ ] Admin/public fleet lists show the existing vehicles and uploaded images.
- [ ] Under Admin -> Vehicles -> Fleet Categories, assign the Self-Drive Buses button
      to Bus (or any custom category) and Chauffeured Hire to the desired category.
      If absent, add Chauffeured Vehicles and assign its vehicles first. Before the
      first save, existing Bus/Chauffeured Vehicles categories or their homepage groups
      supply defaults; no category means no vehicles. Save both button choices.
- [ ] Refresh desktop and mobile homepages: order is Self-Drive Buses, Chauffeured Hire,
      Special Occasions, Taxi. Verify both image-hero and ordinary layouts if used.
- [ ] Check /book has the same four services/order. Its first two lists and website
      fleet links show the chosen categories. A cleared/deleted assignment produces
      an empty result, with the remaining fleet accessible through All Vehicles.
- [ ] Reassign a button to another category, save, reopen Admin and refresh both public
      destinations to confirm persistence. Both buttons may use the same category.
- [ ] Chauffeur Only is absent from built-in filters and vehicle badges. Only vehicles
      configured for self-drive show the green Self-Drive badge. Hire prices/options
      remain appropriate; Enquiry Only still opens the event form without a calendar.
- [ ] Special Occasions opens the event page; Taxi retains the phone dialog or online
      flow according to its existing setting. Check one real event enquiry reaches
      Admin -> Enquiries -> Contact Enquiries and notification email.

### Rollback and remaining host work

Restore the previous .next and matching package.json; the existing one-click rollback
restores only the build. Retain the additive SQL/category engine repair. Keep saved
button settings for a later retry. A full-package backup is needed for older platform
rollbacks involving dependencies or startup files.

Existing host/security follow-up remains separate: Mapbox rotation/restriction and
any other reused credentials, coordinated historical secret cleanup, and provider
confirmation of applicable PHP/cPanel/CloudLinux/Passenger patches and restarts in
SECURITY-REVIEW-2026-10-26.md. Owner reported production DB_PASSWORD and ADMIN_JWT_SECRET
were different from historical files; Microsoft secret differed, and vendor JWT,
admin/maintenance passwords and VAPID keys were changed. No secrets are recorded here.
