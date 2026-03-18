import Link from 'next/link'
import { notFound } from 'next/navigation'
import { query, queryOne } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import CustomerNotes from './CustomerNotes'
import CustomerActions from './CustomerActions'
import type { Metadata } from 'next'

export const revalidate = 0

interface Props { params: { email: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: decodeURIComponent(params.email) }
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

export default async function CustomerDetailPage({ params }: Props) {
  const email = decodeURIComponent(params.email)

  const [bookings, notes, aliases, archivedRow] = await Promise.all([
    query<{
      id: string; public_id: string; status: string; hire_type: string;
      start_date: string; end_date: string; total_days: number;
      total_cost: number; contact_name: string | null; contact_phone: string | null;
      vehicle_name: string | null; created_at: Date; contact_email: string;
    }>(
      `SELECT b.id, b.public_id, b.status, b.hire_type, b.start_date, b.end_date,
              b.total_days, b.total_cost, b.contact_name, b.contact_phone,
              b.contact_email, v.name as vehicle_name, b.created_at
       FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id
       WHERE b.contact_email = ?
       ORDER BY b.created_at DESC`,
      [email]
    ),
    query<{ id: string; text: string; created_at: Date }>(
      'SELECT id, text, created_at FROM CustomerNote WHERE contact_email = ? ORDER BY created_at DESC',
      [email]
    ),
    query<{ id: string; alias_email: string }>(
      'SELECT id, alias_email FROM CustomerAlias WHERE primary_email = ? ORDER BY created_at ASC',
      [email]
    ),
    queryOne<{ email: string }>(
      'SELECT email FROM CustomerArchive WHERE email = ? LIMIT 1',
      [email]
    ),
  ])

  // Fetch alias bookings and merge
  let aliasBookings: typeof bookings = []
  if (aliases.length > 0) {
    const aliasEmails = aliases.map(a => a.alias_email)
    for (const aliasEmail of aliasEmails) {
      const ab = await query<{
        id: string; public_id: string; status: string; hire_type: string;
        start_date: string; end_date: string; total_days: number;
        total_cost: number; contact_name: string | null; contact_phone: string | null;
        vehicle_name: string | null; created_at: Date; contact_email: string;
      }>(
        `SELECT b.id, b.public_id, b.status, b.hire_type, b.start_date, b.end_date,
                b.total_days, b.total_cost, b.contact_name, b.contact_phone,
                b.contact_email, v.name as vehicle_name, b.created_at
         FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id
         WHERE b.contact_email = ?
         ORDER BY b.created_at DESC`,
        [aliasEmail]
      )
      aliasBookings = aliasBookings.concat(ab)
    }
  }

  const allBookings = [...bookings, ...aliasBookings].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  if (allBookings.length === 0) notFound()

  const totalSpend = allBookings.reduce((sum, b) => sum + b.total_cost, 0)
  const name = bookings[0]?.contact_name ?? aliasBookings[0]?.contact_name
  const phone = bookings[0]?.contact_phone ?? aliasBookings[0]?.contact_phone
  const isArchived = !!archivedRow

  return (
    <div className="px-10 py-10 max-w-4xl">
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-7">
        ← Back to Customers
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display font-bold text-[26px] tracking-tight">{name ?? email}</h1>
          {isArchived && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-bg border border-border text-ink-4 uppercase tracking-wide">
              Archived
            </span>
          )}
        </div>
        {name && <p className="text-[14px] font-mono text-ink-3 mt-0.5">{email}</p>}
        {phone && <p className="text-[14px] text-ink-3">{phone}</p>}
        {aliases.length > 0 && (
          <p className="text-[12.5px] text-ink-4 mt-1">
            Also: {aliases.map(a => a.alias_email).join(', ')}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-border rounded-xl px-6 py-5">
          <p className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider mb-1">Total Bookings</p>
          <p className="font-display font-extrabold text-[28px] tracking-tight">{allBookings.length}</p>
        </div>
        <div className="bg-white border border-border rounded-xl px-6 py-5">
          <p className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider mb-1">Total Spend</p>
          <p className="font-display font-extrabold text-[28px] tracking-tight">{formatCurrency(totalSpend / 100)}</p>
        </div>
        <div className="bg-white border border-border rounded-xl px-6 py-5">
          <p className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider mb-1">First Booking</p>
          <p className="font-display font-bold text-[18px] tracking-tight">
            {new Date(allBookings[allBookings.length - 1].created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Booking history */}
      <div className="bg-white border border-border rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border bg-bg">
          <h2 className="font-display font-bold text-[14px]">Booking History</h2>
        </div>
        <table className="w-full text-[13.5px]">
          <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <th className="text-left px-6 py-3">Ref</th>
              <th className="text-left px-6 py-3">Vehicle</th>
              <th className="text-left px-6 py-3">Dates</th>
              <th className="text-left px-6 py-3">Total</th>
              <th className="text-left px-6 py-3">Status</th>
              {aliases.length > 0 && <th className="text-left px-6 py-3">Email</th>}
            </tr>
          </thead>
          <tbody>
            {allBookings.map(b => (
              <tr key={b.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                <td className="px-6 py-3">
                  <Link href={`/admin/bookings/${b.id}`} className="font-mono font-bold text-accent hover:underline text-[12.5px]">
                    {b.public_id}
                  </Link>
                </td>
                <td className="px-6 py-3 text-ink-3">{b.vehicle_name ?? '—'}</td>
                <td className="px-6 py-3 text-ink-3">{b.start_date} → {b.end_date}</td>
                <td className="px-6 py-3 font-semibold">{formatCurrency(b.total_cost / 100)}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                    {b.status}
                  </span>
                </td>
                {aliases.length > 0 && (
                  <td className="px-6 py-3 text-ink-4 text-[12px] font-mono">
                    {b.contact_email !== email ? b.contact_email : ''}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <CustomerNotes
          email={email}
          initialNotes={notes.map(n => ({
            ...n,
            created_at: n.created_at instanceof Date ? n.created_at.toISOString() : String(n.created_at),
          }))}
        />
      </div>

      {/* Customer actions (linking + archive) */}
      <CustomerActions
        email={email}
        isArchived={isArchived}
        initialAliases={aliases}
      />
    </div>
  )
}
