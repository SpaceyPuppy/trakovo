# Trakovo v1.15.2

Vendor billing cutover and single-trip invoice improvements.

## Vendor billing

- Bill-run eligibility now has a fixed lower boundary: only vendor hires with `Booking.start_date` on or after 1 July 2026 can be reviewed or invoiced.
- The selected bill-run cutoff remains the upper boundary and is now labelled **Include completed trips through**.
- Every review continues to include all eligible, outstanding bookings without an active invoice claim. Skipped bookings remain outstanding for the next run.
- The bill-run creation transaction revalidates the same commencement date, cutoff, price, currency, vendor and active-claim rules before creating any invoices.

## Single vendor-trip invoices

- Completed, priced vendor bookings from 1 July 2026 onward now show **Create single vendor invoice** on the admin booking detail page.
- The action creates a vendor draft with one booking line and no bill-run ID.
- Vendor billing identity, terms, currency, issuer and tax settings are snapshotted using the same ledger path as consolidated bill runs.
- The booking is claimed atomically, so it cannot later be duplicated in another invoice or bill run.
- The existing `invoice_created` audit event identifies whether an invoice came from a direct booking, vendor bill run or single vendor booking.

## Clean invoice printing

- **Print / Save PDF** now outputs the invoice only, without the admin sidebar, top bars or surrounding application frame.
- The printed invoice uses a white document background with print-friendly borders and full-page content flow.

## Deployment

- No SQL, environment-variable, dependency or cron changes are required.
- The corrected v1.15.1 root `app.js` must remain installed; the v1.15.2 OTA bundle replaces only `.next` and `package.json`.
- Editable invoice/email templates, preview/test sending, explicit sending and PDF attachment remain planned for v1.15.3.
