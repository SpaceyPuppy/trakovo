import Link from 'next/link'
import { query } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Customers' }
export const revalidate = 0

export default async function CustomersPage() {
  const [customers, archived, aliases] = await Promise.all([
    query<{
      contact_email: string
      contact_name: string | null
      contact_phone: string | null
      total_bookings: number
      total_spend: number
      last_booking: Date
    }>(
      `SELECT
        contact_email,
        MAX(contact_name) as contact_name,
        MAX(contact_phone) as contact_phone,
        COUNT(*) as total_bookings,
        SUM(total_cost) as total_spend,
        MAX(created_at) as last_booking
       FROM Booking
       WHERE contact_email != '' AND contact_email IS NOT NULL
       GROUP BY contact_email
       ORDER BY last_booking DESC`
    ),
    query<{ email: string }>('SELECT email FROM CustomerArchive'),
    query<{ primary_email: string; alias_email: string }>(
      'SELECT primary_email, alias_email FROM CustomerAlias'
    ),
  ])

  const archivedEmails = new Set(archived.map(a => a.email))
  const aliasEmails = new Set(aliases.map(a => a.alias_email))

  // For each primary, collect alias booking stats
  const aliasStatsByPrimary: Record<string, { bookings: number; spend: number }> = {}
  for (const alias of aliases) {
    if (!aliasStatsByPrimary[alias.primary_email]) {
      aliasStatsByPrimary[alias.primary_email] = { bookings: 0, spend: 0 }
    }
    const aliasCustomer = customers.find(c => c.contact_email === alias.alias_email)
    if (aliasCustomer) {
      aliasStatsByPrimary[alias.primary_email].bookings += aliasCustomer.total_bookings
      aliasStatsByPrimary[alias.primary_email].spend += aliasCustomer.total_spend
    }
  }

  const visible = customers.filter(
    c => !archivedEmails.has(c.contact_email) && !aliasEmails.has(c.contact_email)
  )

  return (
    <div className="px-10 py-10">
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Customers</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">All contacts derived from booking history. Click a customer to view their bookings and notes.</p>
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {visible.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13.5px] text-ink-4">No bookings yet.</div>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Phone</th>
                <th className="text-left px-6 py-3">Bookings</th>
                <th className="text-left px-6 py-3">Total Spend</th>
                <th className="text-left px-6 py-3">Last Booking</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(c => {
                const extra = aliasStatsByPrimary[c.contact_email]
                const totalBookings = c.total_bookings + (extra?.bookings ?? 0)
                const totalSpend = c.total_spend + (extra?.spend ?? 0)
                return (
                  <tr key={c.contact_email} className="border-t border-border hover:bg-bg/50 transition-colors">
                    <td className="px-6 py-3 font-medium">
                      {c.contact_name ?? <span className="text-ink-4 italic">—</span>}
                      {extra && <span className="ml-1.5 text-[10.5px] text-ink-4 font-normal">(+{extra.bookings} linked)</span>}
                    </td>
                    <td className="px-6 py-3 text-ink-3 font-mono text-[12.5px]">{c.contact_email}</td>
                    <td className="px-6 py-3 text-ink-3">{c.contact_phone ?? '—'}</td>
                    <td className="px-6 py-3 text-ink-3">{totalBookings}</td>
                    <td className="px-6 py-3 font-semibold">{formatCurrency(totalSpend / 100)}</td>
                    <td className="px-6 py-3 text-ink-3">
                      {new Date(c.last_booking).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/admin/customers/${encodeURIComponent(c.contact_email)}`}
                        className="text-accent hover:underline font-medium text-[13px]">
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
