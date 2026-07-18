# Native Billing MVP

This guide describes the billing functionality introduced in Trakovo v1.15.0. It is for staff operating billing and developers maintaining the ledger.

## Scope

The MVP supports:

- Direct invoices for non-vendor bookings
- Consolidated vendor invoices containing one line per completed booking
- Staff-triggered vendor bill runs with a review step
- Draft, issue, partial-payment, paid, and void workflows
- Payment references, methods, dates, notes, and allocations
- Immutable invoice identity, recipient, price, and tax snapshots
- Audit events and idempotent write requests
- Optional tax-inclusive GST calculation

It does not store card numbers or bank credentials. Payments are recorded after they are received through an external channel such as bank transfer, cash, EFTPOS, or a separate payment provider.

## Money and accounting rules

All monetary values are stored and exchanged as integer cents. For example, `$123.45` is `12345`. Do not store floating-point dollar values in billing tables or send dollar values in `amount_cents` API fields.

An invoice total is snapshotted when the draft is created. Later edits to a booking price, vendor contact details, business identity, or tax settings do not silently rewrite an existing invoice.

Each actively billed booking has one unique `InvoiceLine.booking_claim`. This prevents the same booking being included in two live invoices, even if two staff members run billing at the same time. Voiding an unpaid invoice retains its historical booking link but releases the active claim so a deliberate replacement can be created.

Issued financial history is not deleted. The MVP permits voiding an unpaid draft or issued invoice. An invoice with a recorded payment cannot be voided; payment reversal and credit-note workflows are post-MVP work.

## Vendor billing flow

1. Staff completes a non-enquiry vendor booking and confirms that it has a positive final price.
2. The booking automatically appears in **Admin → Billing & Invoices → Vendor bill run** when its service end date is on or before the selected cutoff.
3. Staff selects **Review ready bookings**.
4. Trakovo groups eligible bookings by vendor and separately identifies records needing attention.
5. Staff reviews vendors, bookings, totals, cutoff, optional due-date override, and notes.
6. Staff selects the vendors to include and confirms the exact reviewed booking snapshots.
7. Trakovo locks only those reviewed bookings and rejects the run if eligibility, vendor, price, or currency changed. It never adds a newly eligible, unreviewed booking.
8. Trakovo creates one consolidated draft invoice per selected vendor and adds one invoice line per reviewed booking.
9. Staff opens each draft, verifies the snapshot, then issues it.
10. Payments are recorded against the invoice. Booking billing state follows the invoice rather than being toggled independently.

A completed booking is ready only when all of the following are true:

- `Booking.status = 'completed'`
- `Booking.is_enquiry = 0`
- The booking has a vendor
- `Booking.end_date` is on or before the bill-run cutoff
- `Booking.total_cost` is greater than zero
- Vendor billing is enabled
- Booking currency matches vendor billing currency
- No active invoice line already claims the booking

Currency is snapshotted when the booking is created: vehicle work inherits the vehicle currency, no-vehicle vendor work inherits the vendor billing currency, and standalone no-vendor work defaults to AUD. Later currency-setting changes do not rewrite historical bookings; a mismatch is shown for staff review.

The review screen reports these exceptions:

- `needs_price`: the completed booking has no positive final price
- `billing_disabled`: billing is disabled for the vendor
- `currency_mismatch`: booking and vendor billing currencies differ

Completing a booking queues it for review; it never silently modifies an existing invoice or automatically emails a customer.

## Direct invoices and marking a booking paid

Direct invoices are created from a non-vendor booking. Cancelled bookings and enquiries cannot be invoiced, and the booking must have a positive price.

To mark a direct booking as paid:

1. Create or open its invoice.
2. Select **Record payment**.
3. Enter the received amount in dollars in the staff form; the UI converts it to cents for the API.
4. Enter the payment date, method, reference, and optional notes.
5. Submit once and wait for confirmation.

If the invoice is still a draft, recording its first payment issues it automatically. Omitting `amount_cents` at the API level records the full remaining balance. A smaller positive amount creates a partial payment.

Vendor bookings must be invoiced through a vendor bill run. Their paid state is derived from the consolidated vendor invoice.

## Invoice statuses

| Status | Meaning | Permitted MVP actions |
|---|---|---|
| `draft` | Created but not issued | Update notes/due date, issue, record payment, void |
| `issued` | Formally issued with issue and due dates | Record payment, void only if unpaid |
| `part_paid` | One or more payments recorded; balance remains | Record another payment |
| `paid` | Allocated payments equal the invoice total | View and audit |
| `void` | Cancelled without retained active booking claims | View and audit; create a deliberate replacement invoice |

The former prototype status `sent` is treated as `issued` by the compatibility API. Code must not set an invoice directly to `paid`; it must create a `Payment` and `PaymentAllocation` so totals and audit history remain consistent.

## Partial payments

Every payment is a separate ledger record containing:

- Amount and currency
- Effective payment date
- Method
- External or bank reference
- Staff notes
- Recording staff username and timestamp

The allocation links the payment to the invoice. The invoice stores derived `amount_paid` and `balance_due` totals for fast display. A payment cannot exceed the current balance. The status becomes `part_paid` while a balance remains and `paid` when the balance reaches zero.

The schema supports allocating one payment across multiple invoices, but the MVP UI/API records one invoice allocation at a time.

## Snapshots and audit trail

The invoice header snapshots:

- Issuer legal name, ABN, email, phone, and address
- Recipient name, ABN, email, phone, and address
- Currency and payment terms
- Tax mode and rate
- Subtotal, tax, total, amount paid, and balance

Each line snapshots its description, service dates, unit amount, subtotal, tax rate, tax, and total. The original booking link remains available for navigation and history.

Bill-run notes remain internal on the `BillingRun` record. They are deliberately not copied to customer-visible invoice notes or printed invoices.

`BillingEvent` is append-only operational history for invoice creation, issue, update, void, payment, and bill-run completion. Staff should correct records through supported actions rather than direct SQL updates.

## Idempotency and safe retries

Invoice creation, payment recording, Admin Quick Add, and vendor bill runs use `Idempotency-Key` request headers. The client must generate one unique key for an intended action and retain that same key until the action either succeeds or definitively fails.

Retrying the same payload with the same key returns the stored response without repeating the financial write. Reusing a key with a different payload returns HTTP `409`. Idempotency responses are retained for 24 hours. Database row locks and the unique booking claim remain the final protection against double invoicing after that window.

Expired records are removed opportunistically by the existing daily `POST /api/cron/email-sequences` job, in batches of up to 1,000. Production must have `CRON_SECRET` configured and that cPanel cron enabled. A successful cron response should contain `idempotency_cleanup: true`; `false` means reminders may still have run but cleanup failed and server logs require review.

If a request times out:

1. Do not change the form or generate a new key.
2. Retry with the same key and identical payload.
3. Refresh the invoice or bill-run list before attempting a new action.
4. If the outcome is still unclear, inspect `RequestIdempotency`, `BillingRun`, `InvoiceLine`, and `BillingEvent` before manually intervening.

## GST configuration

GST is disabled by default. Configure these values in the `Setting` table through the authenticated settings API or admin settings UI:

| Setting | Example | Purpose |
|---|---|---|
| `billing_tax_mode` | `none` or `inclusive` | Enables tax derivation without changing the booking total |
| `billing_tax_rate_bps` | `1000` | Tax rate in basis points; `1000` means 10% |

With `billing_tax_mode=none`, tax is zero. With `inclusive`, the booking price remains the invoice total and Trakovo derives the tax component per line. Invalid or missing inclusive rates fall back to 1000 basis points. Existing invoices retain their original tax snapshot when settings change.

Tax treatment and invoice wording should be confirmed with the business accountant before enabling GST in production.

## Issuer and vendor setup

Configure the issuer before issuing the first production invoice:

- `billing_legal_name`
- `billing_abn`
- `billing_email`
- `billing_phone`
- `billing_address`
- GST settings above

If `billing_legal_name` is empty, Trakovo falls back to `site_name`, then `NEXT_PUBLIC_SITE_NAME`, then `Trakovo`.

Each vendor has:

- `billing_name`
- `billing_email`
- `billing_address`
- `billing_abn`
- `billing_currency` (default `AUD`)
- `billing_terms_days` (default 14)
- `billing_enabled` (default true)

Empty vendor billing name/email fields fall back to the vendor name and contact email. Verify them before the first bill run.

## Admin APIs

All routes require an authenticated admin session.

- `GET /api/admin/invoices?status=&vendor_id=&limit=&offset=` lists invoices with cents-based totals and pagination.
- `POST /api/admin/invoices` creates a direct draft invoice. Body: `{ booking_id, due_date?, notes? }`. Requires `Idempotency-Key`.
- `GET /api/admin/invoices/:id` returns the invoice header, lines, payments, and audit events.
- `PATCH /api/admin/invoices/:id` accepts `{ action: 'issue', issue_date?, due_date? }`, `{ action: 'void', reason? }`, or `{ action: 'update', due_date?, notes? }`.
- `POST /api/admin/invoices/:id/payments` accepts `{ amount_cents?, payment_date?, method?, reference?, notes? }`. Requires `Idempotency-Key`.
- `GET /api/admin/billing/ready?cutoff=YYYY-MM-DD&vendor_id=...` previews ready and exception bookings. Repeat `vendor_id` to filter multiple vendors.
- `POST /api/admin/billing/runs` accepts `{ cutoff_date, vendor_ids?, reviewed_bookings, due_date?, notes? }`. Each reviewed booking is `{ id, vendor_id, total_amount, currency }`; the maximum is 1,000. Requires `Idempotency-Key` and creates draft invoices only.
- `GET /api/admin/billing/runs/:id` returns a run and its invoices.

Dates use `YYYY-MM-DD`. Billing write errors return a stable `code` alongside the human-readable `error`.

## Failure and concurrency behaviour

- Bill-run confirmation rechecks the exact reviewed snapshots inside a database transaction.
- Only reviewed booking rows are locked; any missing, newly claimed, repriced, currency-changed, vendor-changed, or otherwise ineligible row rejects the complete run with `billing_review_stale`.
- A run supports at most 200 selected vendors and 1,000 bookings.
- A run cannot combine currencies.
- Any invalid or changed reviewed booking rejects the entire run; no invoices are committed. Refresh review before trying again.
- A database error rolls back the complete financial mutation and its idempotency record.
- Invoice generation and payment recording do not call an external invoicing or payment service.
- Email/PDF delivery is not performed by the ledger transaction.

## MVP limitations and planned work

- No credit notes, refunds, or payment-reversal UI/API
- No automatic bank-feed reconciliation
- No online payment gateway or hosted payment link
- No automatic invoice email/PDF archive yet
- No recurring scheduled bill runs; runs are staff-triggered
- No split allocation UI for one remittance across several invoices
- No general-ledger, BAS, payroll, or double-entry accounting module
- No vendor self-service billing portal in the MVP
- Issued invoice editing is intentionally restricted; corrections require the future credit-note workflow
- Tax-exclusive pricing is not implemented
- Idempotency records currently expire after 24 hours
- Bill-run review snapshots protect booking identity, vendor, cents total, currency, and eligibility. They do not fingerprint descriptive fields such as contact name, vehicle label, or a start-date change that remains within the same cutoff; staff should refresh review after editing booking details.

## Staff acceptance checklist

- [ ] Configure and verify issuer identity and tax settings
- [ ] Verify vendor billing names, emails, terms, currencies, and enabled flags
- [ ] Complete a priced vendor booking and confirm it appears in bill-run review
- [ ] Complete a zero-priced vendor booking and confirm it appears under needs attention
- [ ] Review a bill run and deselect one vendor
- [ ] Change a reviewed booking price before confirmation and confirm the complete run returns `billing_review_stale` without creating invoices
- [ ] Create the run and confirm one draft invoice per selected vendor
- [ ] Confirm each invoice contains exactly one line per included booking and correct cents-to-dollars display
- [ ] Repeat the run cutoff and confirm previously claimed bookings are not billed again
- [ ] Issue a draft and verify issue/due dates
- [ ] Record a partial payment and verify `part_paid`, amount paid, and remaining balance
- [ ] Record the balance and verify `paid`
- [ ] Create a direct invoice from a non-vendor booking
- [ ] Record its full payment and confirm a draft auto-issues and becomes paid
- [ ] Void an unpaid invoice and confirm the booking can be deliberately re-invoiced
- [ ] Confirm an invoice with a payment cannot be voided
- [ ] Retry a write with the same idempotency key and confirm no duplicate is created
- [ ] Reuse a key with a changed payload and confirm HTTP `409`
- [ ] Verify invoice audit events identify the staff actor and action
- [ ] Confirm no card or bank credentials are requested or stored
