# Trakovo v1.16.0-docker.6

Docker test pre-release for the admin and vendor portal polish work.

## Included

- Refreshed the admin portal chrome across the dashboard, bookings, calendar, vehicles, drivers, vendors, users, and settings areas.
- Replaced generic emoji menu symbols with a consistent inline icon system and clearer grouped navigation.
- Made the admin bookings table the default view, with server-side sorting for booking date, reference, vehicle, customer/vendor, and received date.
- Clarified vendor booking rows with the actual vehicle name instead of “B2B Vehicle Choice”.
- Displayed the vendor organisation as the primary party, with contact/client context beneath it when available; direct vendor use is shown when no third-party client was supplied.
- Applied the same visual language to vendor navigation, dashboards, vehicle views, and booking flows.

## Deployment notes

- Docker test pre-release only; this tag does not replace the production cPanel release.
- No database schema changes, new environment variables, or dependency changes are required.
