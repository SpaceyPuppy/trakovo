# Trakovo v1.20.1 — Service buttons and category assignments

The main service buttons now show **Self-Drive Buses, Chauffeured Hire, Special
Occasions, Taxi**, in that order, across desktop/mobile website layouts and the
booking app. Self-Drive Buses and Chauffeured Hire display vehicles from categories
chosen in **Admin -> Vehicles -> Fleet Categories -> Service buttons**. Changes apply
to both browsing flows on refresh. Special Occasions and Taxi retain dedicated pages;
the existing taxi call-to-book/online setting is respected.

The built-in Chauffeur Only filter and vehicle badge are removed. Self-Drive Available
remains a filter, and eligible vehicles show a green Self-Drive badge. Vehicle hire
settings, pricing and Enquiry Only booking behaviour continue to apply.

## Install and configure

Use **next-bundle-v1.20.1.zip** through Admin -> Settings -> Updates. Manual Deploy is
available if GitHub checking/downloading still reports Fetch failed. Back up the
database, .next and package.json first. No dependency install, environment change or
server build is needed from the fully installed v1.19.0+ platform with the v1.20 SQL.

Published OTA SHA-256:
`f6781f75f1c88e19e5883b748e6d358d91014c423e741fb9da0950ad5efba354`.

**For the owner's repaired v1.20.0 server, no further SQL is required.** The owner
confirmed the FleetCategory InnoDB conversion, missing assignment table creation and
Bus seed succeeded. Other installations must inspect their schema first: apply 0003
only if enquiry_only is absent, and use the separate **0005-v1.20.0-category-engine-repair.sql**
download for missing/partially applied category tables. Confirm Vehicle uses InnoDB
and its id uses utf8mb4_unicode_ci. Do not rerun 0004 or import init.sql on production.
The OTA does not run SQL. Historical migration 0004 remains unchanged for checksum
tracking; new fresh-install Vehicle/category definitions explicitly use InnoDB.

After updating, choose and save each button's category in Admin. Existing Bus and
Chauffeured Vehicles categories (or matching homepage groups) provide initial defaults
until saved. Add Chauffeured Vehicles if needed, then assign vehicles in their editors.
Empty/deleted category choices show no vehicles rather than falling back to hire modes.
The Self-Drive filter and each vehicle's booking options remain based on hire settings.

Verify both desktop/mobile website layouts, /book, category changes after saving,
fleet visibility, green Self-Drive badges, event enquiries and Taxi booking behaviour.
For rollback, restore the previous build and matching package.json; the existing
one-click rollback restores only the build. Retain the database repair and host patches.
Installation and real production enquiry/email verification remain owner-managed.
