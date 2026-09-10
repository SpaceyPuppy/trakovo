# Trakovo v1.17.0

## Customer booking flow

- Dry-hire customers can enter their driver licence number and expiry online or choose to
  present the licence for verification on the day of hire.
- Vehicles configured with a licence class beyond `C` show a prominent warning that the
  required class must be held or the booking will be cancelled.
- Admin booking details and notification emails clearly identify bookings where licence
  verification has been deferred.

## Deployment

- Adds `Booking.licence_verification_deferred`; apply the release migration before starting
  the new application build.
- Docker deployments apply `database/migrations/0001-v1.17.0-licence-verification.sql` through
  the existing checksum-tracked migration runner.
- cPanel deployments must apply the equivalent SQL in `PENDING-DEPLOY.md` through phpMyAdmin.
- No new environment variables, dependencies, or scheduled jobs are required.
