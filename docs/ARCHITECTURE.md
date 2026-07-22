# Trakovo Architecture

Last reviewed: 19 July 2026

This is the canonical technical overview. It describes the current repository, not a future
native-app architecture.

## System shape

Trakovo is a single Next.js 14 application using the App Router. It serves public booking
screens, the admin/vendor/driver portals, and JSON API routes from the same deployment. MySQL
is accessed directly through `mysql2`; Prisma is retained only as historical schema reference
material and must not be introduced at runtime.

```text
Browser / installed web app
  -> Next.js pages and API routes
     -> auth and domain libraries
        -> MySQL
        -> Mapbox, CrazyTel, Microsoft Graph/SMTP, Google Calendar, Web Push
        -> persistent upload storage outside the release directory
```

The production host is cPanel shared hosting with CloudLinux and Phusion Passenger. This
constraint favours pure-JavaScript dependencies, raw SQL, durable external upload storage,
and controlled release bundles.

## Application surfaces

| Surface | Purpose | Authentication |
|---|---|---|
| `/book`, `/vehicles`, `/contact`, `/corporate` | Public passenger/customer flows | Public, with server-side validation and throttling where implemented |
| `/admin` | Fleet, booking, dispatch, billing, communications, settings, and release administration | Admin JWT cookie |
| `/vendor` | Vendor bookings, customers, fleet access, calendar, and support | Vendor JWT cookie |
| `/driver` | Assigned work, calendar, notes, and messaging | Driver JWT cookie |
| `/api/**` | Server-side application and integration boundary | Route-specific public or portal checks |

Middleware protects portal routes and handles maintenance/development mode. Admin, vendor,
and driver sessions use separate HTTP-only cookies and separate secrets. The master admin is
configured through environment variables; additional admins are stored in MySQL.

## Code boundaries

- `src/app/` contains pages, layouts, and route handlers.
- `src/components/` contains shared public and portal UI.
- `src/lib/db.ts` owns the MySQL pool and raw query helpers.
- `src/lib/*-auth.ts` owns portal token creation and verification.
- `src/lib/booking-*` and `src/lib/admin-booking-mutations.ts` contain shared booking rules
  and mutation support.
- `src/lib/billing/` contains the v1.15 billing domain and read/write services.
- `src/lib/repositories/` contains selected database access abstractions; other older areas
  still issue raw SQL directly from route handlers.
- `src/lib/email*.ts`, `sms*.ts`, `calendar.ts`, `push.ts`, and `microsoft-token.ts` isolate
  external communications.
- `src/lib/hooks/` contains client-side Mapbox routing/search and service-feature hooks.
- `src/types/` contains shared TypeScript shapes.
- `prisma/init.sql` is the canonical fresh-install schema even though Prisma is not used at
  runtime.

## Data and schema management

MySQL is the system of record for vehicles, bookings, notes, drivers, vendors, customers,
settings, feature toggles, enquiries, ratings, and billing data. Uploaded documents and media
are stored under the configured `UPLOAD_DIR`, outside the deployed application directory.

There is no automatic migration runner. The rules are therefore:

1. Update `prisma/init.sql` for a correct fresh install.
2. Put ordered upgrade SQL and verification queries in the root `PENDING-DEPLOY.md`.
3. Back up production and apply the release SQL manually before starting incompatible code.
4. Record the actual deployed version and applied schema after verification.

Never run `prisma generate`, add Prisma runtime packages, or treat `init.sql` as an in-place
upgrade script.

## Booking and dispatch model

Vehicle hire bookings support availability, vendor/customer relationships, assignments,
notes, pricing, documents, and status changes. Taxi requests currently enter the same broad
operational booking domain but remain a request-and-confirm workflow.

The following rideshare capabilities do not yet exist as a complete domain model: eligible
driver discovery, offer fan-out, atomic first acceptance, reassignment, presence, live trip
location, passenger status streaming, cancellation policy, and dispatch audit/timeout rules.
Those should be designed as explicit server-owned state transitions before native clients are
built.

## Integration boundaries

- **Mapbox:** maps, geocoding/search, and route presentation. The server must remain the trust
  boundary for persisted values and future fare/dispatch decisions.
- **CrazyTel:** SMS delivery. Templates and phone normalisation belong in shared server-side
  code; provider responses must be logged without exposing message or credential data.
- **Microsoft Graph / SMTP:** email, with Graph as the preferred path and SMTP fallback.
- **Google and Microsoft calendars:** operational calendar connections; synchronisation is
  not a general-purpose two-way booking authority.
- **Web Push:** currently useful infrastructure, but not yet a dependable driver-offer system.
- **Uploads:** served through application routes from persistent storage; access rules and
  retention require continued security review.
- **GitHub releases / OTA:** retrieves prepared `.next` bundles and restarts Passenger.

## Mobile direction

Keep business rules, permissions, booking/dispatch transitions, and idempotency on the server.
Near term, harden the responsive web passenger flow and build an installable driver PWA for
notification/acknowledgement. Once those APIs and state transitions are stable, Android and
iPhone clients can use the same versioned contracts. Native apps will still require platform
push, background-location permissions, secure token storage, deep links, privacy disclosures,
store release processes, and mobile-specific observability.

See [`PRODUCT-STATUS.md`](PRODUCT-STATUS.md) for capability status and
[`DEPLOYMENT.md`](DEPLOYMENT.md) for the release process.

