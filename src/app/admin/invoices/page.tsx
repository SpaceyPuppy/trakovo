import type { Metadata } from 'next'
import { listInvoices } from '@/lib/billing'
import { getSettings } from '@/lib/settings'
import BillRunPanel from './BillRunPanel'
import BillingSettingsPanel from './BillingSettingsPanel'
import InvoicesList from './InvoicesList'

export const metadata: Metadata = { title: 'Billing & Invoices' }
export const revalidate = 0
const PAGE_SIZE = 50
const INVOICE_STATUSES = new Set(['draft', 'issued', 'part_paid', 'paid', 'void'])

const BILLING_SETTING_KEYS = [
  'billing_legal_name', 'billing_abn', 'billing_email', 'billing_phone',
  'billing_address', 'billing_invoice_footer', 'billing_tax_mode', 'billing_tax_rate_bps',
] as const

export default async function InvoicesPage({ searchParams }: { searchParams?: { page?: string; status?: string } }) {
  const requestedPage = Number(searchParams?.page ?? 1)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const status = searchParams?.status && INVOICE_STATUSES.has(searchParams.status)
    ? searchParams.status
    : 'all'
  const [result, billingSettings] = await Promise.all([
    listInvoices({
      status: status === 'all' ? null : status,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getSettings(BILLING_SETTING_KEYS),
  ])

  return (
    <div className="px-5 py-8 md:px-10 md:py-10">
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Billing &amp; Invoices</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">
          Create reviewed vendor bill runs, issue invoices and record payments.
        </p>
      </div>

      <BillingSettingsPanel initialSettings={billingSettings} />
      <BillRunPanel />

      <div className="mt-9 mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-[19px]">Invoices</h2>
          <p className="text-[12.5px] text-ink-4 mt-0.5">
            Showing {result.invoices.length === 0 ? 0 : result.pagination.offset + 1}–{Math.min(result.pagination.offset + result.invoices.length, result.pagination.total)} of {result.pagination.total} invoices.
          </p>
        </div>
      </div>
      <InvoicesList
        invoices={result.invoices}
        currentPage={page}
        total={result.pagination.total}
        pageSize={PAGE_SIZE}
        status={status}
      />
    </div>
  )
}
