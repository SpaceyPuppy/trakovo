# Trakovo v1.18.0

**Withdrawn during packaging verification. Use v1.18.1 instead.** The cPanel ZIPs
included a Docker-only standalone tree containing an environment file. The corrected
packager excludes it and rejects unexpected environment files.

## Taxi phone bookings

- Taxi links on the booking picker, homepage and services page open a call-to-book dialog.
- The default taxi booking number is **0488 838 442**.
- Change the number or launch online taxi bookings under **Admin → Settings → Booking App
  → Taxi Bookings**. Online bookings are off by default.
- Direct taxi URLs show phone booking instead of mounting the map/app; the public taxi
  submission API also rejects requests while phone booking is selected. Vendor bookings
  are unchanged.
- Removed public Coming Soon labels and taxi availability-soon copy. Unlaunched rideshare
  cards are hidden and the old placeholder URL redirects to the booking picker.
- Taxi page content and metadata now describe an available service. Search engines need
  to recrawl the updated pages before old snippets disappear.

## cPanel OTA upgrade from v1.15.3

Use **`next-bundle-v1.18.0.zip`** after backing up the database/application and applying
the v1.17 licence-verification column below, **only if absent**:

```sql
ALTER TABLE `Booking`
  ADD COLUMN `licence_verification_deferred` BOOLEAN NOT NULL DEFAULT false
  AFTER `driver_licence_expiry`;
```

Follow the preflight, ordering, checks and rollback guidance in `PENDING-DEPLOY.md`.
This is the only outstanding schema change for an existing v1.15.3 installation.
No new dependencies, public assets, environment variables or cron jobs are needed.
Intermediate v1.16/v1.17 installations are unnecessary; their portal refresh and customer
licence-verification features are included.

Publishing this release does not install it on production. Installation remains owner-managed.
