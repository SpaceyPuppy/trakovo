# Trakovo Product Status

Last reviewed: 19 July 2026

This document is the canonical summary of what Trakovo is today and what it is intended to
become. It distinguishes source-code capability from production deployment state.

## Release state

| Environment | Version | State |
|---|---:|---|
| Production | v1.14.4 | Current live release, as confirmed by the owner |
| Repository / next release | v1.15.0 | Code and release package prepared |
| v1.15.0 production upgrade | v1.15.0 | Scheduled for 20 July 2026; required SQL has not yet been applied |

Do not describe v1.15.0 features as live until the SQL, deployment, and smoke-test items in
[`PENDING-DEPLOY.md`](../PENDING-DEPLOY.md) have been completed.

## Product direction

The long-term product is a full rideshare-style booking system: passengers request a ride,
eligible drivers are notified, a driver accepts the work, and both sides receive reliable
trip status and location updates.

The near-term launch mode is deliberately simpler: **request and confirm**. A passenger can
submit a taxi request, the business receives it, and staff confirm and dispatch it manually.
The next operational milestone is instant notification to drivers through a companion driver
experience, followed by acceptance and dispatch coordination.

## What currently works

### Passenger and customer flows

- Public vehicle browsing and booking for chauffeured and self-drive hire.
- Availability checks, multi-leg chauffeured trip details, hire agreements, and identity or
  licence uploads for relevant hire flows.
- A mobile-oriented `/book` service picker and taxi request flow.
- Mapbox map display, address search/geocoding, pickup and destination selection, and route
  presentation when configuration and browser permissions are available.
- Server-side taxi request creation with a pending/requested state.
- Customer and dispatch SMS attempts through CrazyTel using configurable templates.
- Contact and corporate enquiry forms.

### Operations

- Admin management of vehicles, bookings, prices, statuses, notes, drivers, vendors,
  customers, settings, communications, and release updates.
- Manual driver assignment to bookings.
- Driver portal views for assigned bookings, calendar information, notes, and admin messages.
- Vendor portal bookings, customers, calendar, fleet access, and support enquiries.
- Microsoft 365 email with SMTP fallback, editable email/SMS templates, and Google/Microsoft
  calendar integration where configured.
- Admin web-push subscription and test infrastructure.
- cPanel/Passenger deployment packages with OTA update and rollback support.

### v1.15.0 source capability, not yet live

- Internal billing runs, invoices, invoice lines, payments, allocations, ledger events, and
  request-idempotency infrastructure.
- Associated admin billing workflow and release-specific database changes.

## Partial, placeholder, or incomplete

| Area | Current state |
|---|---|
| Taxi dispatch | Requests are stored and staff can act on them; there is no automatic driver matching, offer queue, acceptance race, or dispatch state machine. |
| Driver notification | General messaging/push pieces exist, but taxi requests are not delivered as reliable per-driver offers with acknowledgement and fallback. |
| Live tracking | No production passenger/driver live-location channel, trip telemetry, ETA refresh loop, or location-retention policy. |
| Rideshare service | The passenger choice is a coming-soon placeholder, not an operational service. |
| Ratings | Feature-toggle and rating infrastructure exists, but it is not connected to a verified end-to-end completed-trip lifecycle. |
| PWA | Manifest/icons and some web-push infrastructure exist; offline behaviour, install reliability, update handling, and passenger/driver push lifecycle are incomplete. |
| Native mobile | No Android or iPhone application is present. The web UI is mobile-oriented but is not a substitute for background location, dependable push, and native-store release work. |
| SMS | Integration and templates exist, but launch-blocking formatting, address/POI content, delivery visibility, retry, and failure-handling work remains. |
| Mapping | Core Mapbox flow exists; local landmark/POI search quality and address presentation require refinement. |
| Testing | TypeScript, lint, and builds can be checked, but there is no committed automated regression suite for booking, dispatch, billing, or integrations. |

## Current priorities

1. Deploy v1.15.0 safely: backup, apply the pending SQL, deploy, and complete production smoke
   checks.
2. Finish launch-critical taxi request quality: phone normalisation, SMS wording/delivery,
   address/landmark search, error recovery, and operator visibility.
3. Operate the request-and-confirm model with explicit status rules and measurable manual
   procedures.
4. Build reliable driver notification and acknowledgement, preferably as an installable
   driver web app before committing to separate native codebases.
5. Add driver offer/acceptance and dispatch concurrency controls, then passenger status
   updates and live tracking.
6. Add automated tests, observability, retry/idempotency controls, privacy controls, and
   operational runbooks before calling the service production-grade rideshare.
7. Stabilise the web APIs and event model, then build Android and iPhone apps against the same
   contracts.

The actionable feature list lives in [`TODO.md`](../TODO.md). Repository and documentation
risk is tracked in [`DOCUMENTATION-DEBT.md`](../DOCUMENTATION-DEBT.md).

