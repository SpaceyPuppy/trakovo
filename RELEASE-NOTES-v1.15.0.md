# Trakovo v1.15.0 — Native Billing and Reliability

This release adds the native billing MVP and hardens the booking, database, and shared-hosting paths that staff use most often.

> **Deployment warning:** v1.15.0 requires the ordered SQL in `PENDING-DEPLOY.md`. Pause writes, take and verify a database backup, apply the migration, and complete its verification queries **before** starting this build. Do not run the new code against the prototype `Invoice` schema.

## Highlights

- Native invoices, consolidated vendor bill runs, partial/full payments, issue/void controls, overdue visibility, print layouts, and an append-only billing audit trail.
- Completed and priced vendor bookings flow into a review queue automatically; only the exact bookings reviewed by staff can enter a bill run.
- Admin Quick Add and booking/status/enquiry/blockout writes now use stricter transactional validation and safe retry protection.
- Booking detail and calendar/list reads use fewer, bounded database queries, improving resilience when staff open several bookings in new tabs.
- Slow-query diagnostics, a conservative configurable database pool, and shared Microsoft token refresh reduce shared-host server pressure.

## Native billing MVP

- Replaced the one-booking prototype with a cents-based ledger covering `BillingRun`, `Invoice`, `InvoiceLine`, `Payment`, `PaymentAllocation`, and `BillingEvent`.
- Creates one consolidated draft invoice per selected vendor and one snapshotted line per completed booking.
- Supports direct booking invoices, issue dates, due dates, partial payments, full settlement, voiding unpaid invoices, and paid/part-paid balances.
- Adds issuer identity, vendor billing identity/address/ABN/currency/terms, and optional tax-inclusive GST configuration.
- Prevents duplicate invoice/payment writes through idempotency keys, row locks, atomic invoice references, and a unique active booking claim.
- Rejects a bill run with `billing_review_stale` if a reviewed booking was claimed, repriced, moved, recurrencyed, or made ineligible before confirmation.
- Keeps internal bill-run notes off customer-visible and printed invoices.
- Persists booking currency at creation: vehicle currency for vehicle work, vendor billing currency for no-vehicle vendor work, and AUD for standalone no-vendor work.
- Keeps void invoice face values in the ledger while clearly showing that their balance is not payable.

See `BILLING-MVP.md` for the operating workflow, accounting rules, API contract, limitations, and staff acceptance checklist.

## Booking, admin, and vendor improvements

- Makes Admin Quick Add idempotent across ambiguous network/proxy failures and surfaces status-change conflicts to staff.
- Runs booking creation, enquiry conversion, status changes, blockouts, and vehicle writes through shared transaction-aware services.
- Applies server-side booking status filters with pagination so older pending/completed work is not hidden by a 50-row page boundary.
- Includes fleet-wide blockouts in vendor multi-booking availability and prevents choosing globally unavailable dates.
- Consolidates vendor multi-booking startup data and bounds month availability queries.
- Adds billing profile controls to vendor details and improves vendor activity/contact display.
- Removes dependent media, vendor assignments, and per-vehicle blockouts when an unused vehicle is deleted.

## Performance and reliability

- Reduces booking-detail query fan-out and makes optional invoice metadata fail independently.
- Adds bounded/paginated admin, vendor, and driver booking reads plus bounded calendar windows.
- Caches low-volatility driver metadata and memoizes repeated calendar mapping.
- Adds a conservative MySQL pool (`DB_CONNECTION_LIMIT`, default 5), slow-query timing (`DB_SLOW_QUERY_MS`, default 250 ms), and an authenticated diagnostics endpoint.
- Centralises Microsoft Graph token reads/refreshes so concurrent email/calendar requests share one refresh operation.
- Allocates invoice references in one atomic block and loads issuer settings once per bill run, reducing run creation from roughly `6N` queries to `3N + 3` for `N` vendor invoices.
- Cleans expired idempotency responses in bounded batches through the existing daily email-sequences cron.
- Uses atomic public-ID counters instead of repeated table-wide maximum scans.

## Other included changes since v1.14.3

- Public contact form and Admin Enquiries workflow.
- Vendor “Login as Vendor” action and clearer username-update feedback.
- Contact page client/server boundary and invoice date-serialisation fixes.
- Shared booking response mapping, API errors, settings/token helpers, and safer trip-detail parsing.

## Deployment and upgrade notes

1. Read `PENDING-DEPLOY.md` completely and save the preflight results.
2. Pause booking/admin writes and take a verified database backup.
3. Apply the ordered v1.15.0 SQL. It preserves a prototype invoice table as `InvoiceLegacyBackup` and migrates compatible history without deleting the backup.
4. Deploy either `trakovo-v1.15.0.zip` (full release) or `next-bundle-v1.15.0.zip` (OTA compiled bundle).
5. Confirm `CRON_SECRET` and the daily email-sequences cron are active.
6. Complete the database, billing, booking, multi-tab, and rollback checks in `PENDING-DEPLOY.md` before resuming writes.

No new required environment variables were added. The new database pool/slow-query variables are optional and documented in `.env.example`.

## Known limitations and documentation debt

- Billing MVP does not yet include credit notes/refunds, bank feeds, payment links, automatic invoice email/PDF archiving, recurring bill runs, or a vendor self-service billing portal.
- Database upgrades remain manual raw SQL; there is no automatic migration runner.
- Repository/security and documentation follow-ups are recorded in `DOCUMENTATION-DEBT.md`, including tracked local environment files, missing `.ai-codex` indexes, unresolved `AGENTS.md` ownership, and older documentation drift.

## Release assets

- `trakovo-v1.15.0.zip` — full cPanel release including source, compiled application, schema, and release documentation.
- `next-bundle-v1.15.0.zip` — minimal OTA bundle containing `.next` and `package.json`.
