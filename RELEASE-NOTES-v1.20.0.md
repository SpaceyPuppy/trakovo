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

Full cPanel package: trakovo-v1.20.0.zip. Do not upload this ZIP to Admin OTA Updates.
Apply only missing database changes from 0003-v1.20.0-enquiry-only-vehicles.sql and
0004-v1.20.0-fleet-categories.sql after the preflight in PENDING-DEPLOY.md. No new runtime
dependencies, environment variables or cron jobs. Keep patched Node 24.22.1+ (24.x).
No server build is needed. Assign existing buses to Bus after deployment; no vehicles
are classified automatically. Never import the fresh schema over production.

Back up before installation. For rollback, restore the matching v1.19.0 app/manifests/
dependency environment while retaining additive SQL and host security patches.
Production deployment, real enquiry/email delivery and host security follow-up remain
owner-managed; publishing the release does not perform them.
