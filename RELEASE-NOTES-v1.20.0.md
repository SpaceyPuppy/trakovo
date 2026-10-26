# Trakovo v1.20.0 — Vehicle enquiries and fleet categories

Public vehicles can now be set to Enquiry Only in Admin. Their actions say Enquire,
and vehicle pages retain photos, specifications and descriptions beside the Special
Occasions form with that vehicle preselected. The public booking calendar is replaced,
and server validation blocks standard bookings and their enquiry fallback for these
vehicles. Staff and vendor permissions are retained. The setting defaults off.

Homepage vehicle tiles become Buses, Chauffeured Vehicles and Special Occasion Vehicles.
Each opens the complete fleet with matching vehicles first. Fleet Categories in Admin
allows names, vehicle assignments and homepage groups to be managed. The initial category
is Bus. Chauffeur Only and Self-Drive Available remain protected built-in filters.
The former homepage feature switch now prefers a vehicle's photo for its category tile;
inactive or public-hidden vehicles cannot supply photos. Tiles also work without photos.

Special Occasions navigation opens on mouse hover. Touch users tap once to expand and
again to follow the page link, in both wide and mobile menus. Outside interaction and
Escape close the dropdown; the separate desktop disclosure button supports keyboard use.

## Installation

**Database compatibility repair available:** the category
migration can fail with MySQL #1071, "max key length is 1000 bytes", when creating
VehicleFleetCategory. Its utf8mb4 composite primary key can require 1,528 bytes.
Do not deploy against a partially applied schema or rerun the whole migration.
The owner confirmed Vehicle was InnoDB, FleetCategory was MyISAM, and the assignment
table was absent. Converting FleetCategory to InnoDB and creating the assignment table
as InnoDB/DYNAMIC succeeded. The separate 0005-v1.20.0-category-engine-repair.sql download
provides that repair and also creates absent category tables. Inspect your schema first;
do not repeat the completed owner repair, drop existing tables or import init.sql.
A missing assignment table can make both public/admin vehicle lists appear empty.
The OTA ZIP does not repair SQL. Original ZIP assets and their checksums are unchanged.

**OTA update available from a fully installed v1.19.0 baseline. Apply SQL first.**
Download `next-bundle-v1.20.0.zip` and use Admin -> Settings -> Updates -> Manual Deploy,
or Pull & Deploy if the server can reach GitHub. SHA-256:
`3132c3367630a9ebf04dc1727deb3a52dcf5d82403686cf0ee39fdc70f8ef73d`.

Before deployment, apply only missing database changes from
`0003-v1.20.0-enquiry-only-vehicles.sql` and `0005-v1.20.0-category-engine-repair.sql` after
schema preflight. Both SQL files are separate release assets. On cPanel, use 0005 in
place of 0004, which remains unchanged for historical migration checksum tracking.
The OTA installer does not apply SQL: missing category tables can make both vehicle
lists appear empty. Do not repeat successful SQL or import the fresh schema.

No new runtime
dependencies, environment variables or cron jobs. Keep patched Node 24.22.1+ (24.x).
No server build is needed. Assign existing buses to Bus after deployment; no vehicles
are classified automatically. Never import the fresh schema over production.

The full `trakovo-v1.20.0.zip` remains available for fresh/manual cPanel installations;
do not upload that full ZIP to Admin OTA Updates. Original full/Docker assets and tag
are unchanged. The OTA uses the original full package's compiled Linux build.

Back up the current build, package manifests and database before installation. For OTA
rollback, restore the previous build and matching package.json (the existing one-click
rollback restores the build only). Retain additive SQL and host security patches.
For full-install rollback, restore the matching complete application/dependency backup.
Production deployment, real enquiry/email delivery and host security follow-up remain
owner-managed; publishing the release does not perform them.
