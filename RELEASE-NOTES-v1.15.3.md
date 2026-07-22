# Trakovo v1.15.3

Focused invoice payment-details and cleanup release.

## Invoice payment details

- Added **Payment details / invoice footer** under **Billing & Invoices → Invoice identity & tax settings**.
- The multiline field can contain bank name, account name, BSB, account number and other payment instructions.
- Use `{{invoice_number}}` in the field to insert the invoice reference automatically, for example `Reference: {{invoice_number}}`.
- Payment details appear at the bottom of the on-screen invoice and in the clean Print / Save PDF output.
- The setting applies to all invoices immediately and uses the existing `Setting` table.

## Delete void invoices

- Void invoices now show **Delete permanently**.
- Deletion requires a second confirmation and is rejected unless the invoice is void and has no payments or payment allocations.
- Invoice lines are removed transactionally, the booking remains available for reinvoicing, related bill-run totals are adjusted, and a standalone deletion audit event is retained.

## Deployment

- No SQL, dependency, environment-variable or cron changes are required.
- The v1.15.3 OTA bundle supersedes v1.15.2 and replaces only `.next` and `package.json`.
- Keep the corrected v1.15.1 root `app.js` installed.
- Editable invoice/email templates, preview/test sending, explicit sending and PDF attachments are deferred to v1.15.4.
