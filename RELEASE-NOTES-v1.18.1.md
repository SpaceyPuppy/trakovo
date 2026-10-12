# Trakovo v1.18.1

Supersedes the withdrawn v1.18.0 release. Use **next-bundle-v1.18.1.zip** for cPanel OTA.

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

## Safe cPanel packaging

- Both cPanel ZIPs exclude the Docker-only `.next/standalone` tree and build cache.
- Packaging now fails if an environment file other than `.env.example` is included.
- Docker packaging is unchanged and continues to exclude environment files via `.dockerignore`.

## cPanel OTA upgrade from v1.15.3

Back up the database/application and apply the v1.17 licence-verification column below,
**only if absent**, before installing the OTA bundle:

```sql
ALTER TABLE `Booking`
  ADD COLUMN `licence_verification_deferred` BOOLEAN NOT NULL DEFAULT false
  AFTER `driver_licence_expiry`;
```

Follow the preflight, ordering, checks and rollback guidance in `PENDING-DEPLOY.md`.
This is the only outstanding schema change for an existing v1.15.3 installation.
No new dependencies, public assets, environment variables or cron jobs are needed.
Intermediate installations are unnecessary; the v1.16 portal refresh and v1.17 customer
licence-verification features are included.

Installation remains owner-managed; release publication does not upgrade production.
