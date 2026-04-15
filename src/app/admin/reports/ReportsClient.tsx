'use client'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Vendor { id: string; name: string }

interface BookingRow {
  id: string; public_id: string; status: string; hire_type: string; service_type: string | null;
  start_date: string; end_date: string; total_days: number; daily_rate: number; total_cost: number;
  contact_name: string | null; contact_email: string; vendor_id: string | null;
  vehicle_name: string | null; vendor_name: string | null;
}

interface Props { vendors: Vendor[] }

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-[#e8f0fe] text-[#1a56db] border-[#c3d8fb]',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getMonthRange(offset = 0) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + offset
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 0)
  return { from: toISO(start), to: toISO(end) }
}

function getQuarterRange() {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3)
  const start = new Date(now.getFullYear(), q * 3, 1)
  const end = new Date(now.getFullYear(), q * 3 + 3, 0)
  return { from: toISO(start), to: toISO(end) }
}

function getYTDRange() {
  const now = new Date()
  return { from: `${now.getFullYear()}-01-01`, to: toISO(now) }
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border rounded-xl px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-4 mb-1">{label}</p>
      <p className="font-display font-bold text-[24px] tracking-tight">{value}</p>
    </div>
  )
}

export default function ReportsClient({ vendors }: Props) {
  const today = toISO(new Date())
  const [from, setFrom] = useState(() => getMonthRange(0).from)
  const [to, setTo] = useState(today)
  const [statuses, setStatuses] = useState('confirmed,completed')
  const [vendorId, setVendorId] = useState('')
  const [bookings, setBookings] = useState<BookingRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyPreset(preset: 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'ytd') {
    const ranges: Record<string, { from: string; to: string }> = {
      thisMonth: getMonthRange(0),
      lastMonth: getMonthRange(-1),
      thisQuarter: getQuarterRange(),
      ytd: getYTDRange(),
    }
    setFrom(ranges[preset].from)
    setTo(ranges[preset].to)
  }

  async function runReport() {
    setLoading(true)
    setError(null)
    setBookings(null)
    try {
      const params = new URLSearchParams({ from, to, statuses })
      if (vendorId) params.set('vendor_id', vendorId)
      const res = await fetch(`/api/admin/reports/revenue?${params}`)
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      const data = await res.json()
      setBookings(data.bookings)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  // Aggregations
  const totalRevenue = bookings ? bookings.reduce((s, b) => s + b.total_cost, 0) : 0
  const avgValue = bookings && bookings.length > 0 ? Math.round(totalRevenue / bookings.length) : 0

  const byVehicle = bookings
    ? Object.values(
        bookings.reduce<Record<string, { name: string; count: number; revenue: number }>>((acc, b) => {
          const key = b.vehicle_name ?? (b.service_type === 'taxi' ? 'Taxi' : 'Unknown')
          if (!acc[key]) acc[key] = { name: key, count: 0, revenue: 0 }
          acc[key].count++
          acc[key].revenue += b.total_cost
          return acc
        }, {})
      ).sort((a, b) => b.revenue - a.revenue)
    : []

  const byVendor = bookings
    ? Object.values(
        bookings.reduce<Record<string, { name: string; count: number; revenue: number }>>((acc, b) => {
          const key = b.vendor_name ?? '__direct__'
          const name = b.vendor_name ?? 'Direct Bookings'
          if (!acc[key]) acc[key] = { name, count: 0, revenue: 0 }
          acc[key].count++
          acc[key].revenue += b.total_cost
          return acc
        }, {})
      ).sort((a, b) => b.revenue - a.revenue)
    : []

  const selectedVendor = vendors.find(v => v.id === vendorId)

  const inp = 'border border-border rounded-[6px] px-3 py-2 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all'
  const sel = `${inp} cursor-pointer`

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-4 mb-1.5">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-4 mb-1.5">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-4 mb-1.5">Include Statuses</label>
            <select value={statuses} onChange={e => setStatuses(e.target.value)} className={sel}>
              <option value="confirmed,completed">Confirmed + Completed</option>
              <option value="completed">Completed only</option>
              <option value="confirmed">Confirmed only</option>
              <option value="pending,confirmed,completed">All active</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-4 mb-1.5">Vendor</label>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)} className={sel}>
              <option value="">All Vendors</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick presets */}
          {(['thisMonth','lastMonth','thisQuarter','ytd'] as const).map((p, i) => (
            <button key={p} onClick={() => applyPreset(p)}
              className="text-[12px] font-semibold text-ink-3 hover:text-accent px-2.5 py-1 rounded-[5px] border border-border hover:border-accent/30 transition-colors">
              {['This Month','Last Month','This Quarter','Year to Date'][i]}
            </button>
          ))}
          <button
            onClick={runReport}
            disabled={loading}
            className="ml-auto bg-accent text-white font-semibold text-[13.5px] px-5 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-60">
            {loading ? 'Loading…' : 'Run Report'}
          </button>
        </div>
        {error && <p className="text-[12.5px] text-red-600 mt-3">{error}</p>}
      </div>

      {/* Results */}
      {bookings !== null && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 print:hidden">
            <StatCard label="Total Bookings" value={String(bookings.length)} />
            <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} />
            <StatCard label="Avg Booking Value" value={bookings.length > 0 ? formatCurrency(avgValue) : '—'} />
          </div>

          {/* Booking breakdown */}
          <section className="print:hidden">
            <h2 className="font-display font-bold text-[17px] mb-3">Booking Breakdown</h2>
            {bookings.length === 0 ? (
              <div className="bg-white border border-border rounded-xl px-6 py-10 text-center text-[13.5px] text-ink-4">
                No bookings found for this period.
              </div>
            ) : (
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      {['Ref','Customer / Vendor','Vehicle','Dates','Days','Amount','Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 first:pl-6 last:pr-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} className="border-t border-border hover:bg-bg/50">
                        <td className="pl-6 pr-4 py-3 font-mono font-bold text-accent text-[12.5px]">{b.public_id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{b.vendor_name ?? b.contact_name ?? b.contact_email}</p>
                          {b.vendor_name && <p className="text-[12px] text-ink-4">{b.contact_name ?? b.contact_email}</p>}
                        </td>
                        <td className="px-4 py-3 text-ink-3">
                          {b.vehicle_name ?? (b.service_type === 'taxi' ? 'Taxi' : '—')}
                        </td>
                        <td className="px-4 py-3 text-ink-3 whitespace-nowrap text-[12px]">
                          {fmtDate(b.start_date)} → {fmtDate(b.end_date)}
                        </td>
                        <td className="px-4 py-3 text-ink-3">{b.total_days}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(b.total_cost)}</td>
                        <td className="px-4 pr-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border capitalize ${STATUS_STYLES[b.status] ?? ''}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-bg">
                      <td colSpan={5} className="pl-6 pr-4 py-3 font-semibold text-ink-3 text-[13px]">
                        {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 font-bold text-[14px]">{formatCurrency(totalRevenue)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {bookings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
              {/* By Vehicle */}
              <section>
                <h2 className="font-display font-bold text-[17px] mb-3">By Vehicle</h2>
                <div className="bg-white border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="text-left px-5 py-3">Vehicle</th>
                        <th className="text-right px-5 py-3">Bookings</th>
                        <th className="text-right px-5 py-3">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byVehicle.map(row => (
                        <tr key={row.name} className="border-t border-border">
                          <td className="px-5 py-3 font-medium">{row.name}</td>
                          <td className="px-5 py-3 text-right text-ink-3">{row.count}</td>
                          <td className="px-5 py-3 text-right font-semibold">{formatCurrency(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* By Vendor */}
              <section>
                <h2 className="font-display font-bold text-[17px] mb-3">By Vendor</h2>
                <div className="bg-white border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="text-left px-5 py-3">Vendor</th>
                        <th className="text-right px-5 py-3">Bookings</th>
                        <th className="text-right px-5 py-3">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byVendor.map(row => (
                        <tr key={row.name} className="border-t border-border">
                          <td className="px-5 py-3 font-medium">{row.name}</td>
                          <td className="px-5 py-3 text-right text-ink-3">{row.count}</td>
                          <td className="px-5 py-3 text-right font-semibold">{formatCurrency(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* Vendor Statement — shown when vendor filter is active */}
          {selectedVendor && bookings.length > 0 && (
            <section>
              <div className="flex items-center justify-between gap-4 mb-3 print:hidden">
                <h2 className="font-display font-bold text-[17px]">Vendor Statement — {selectedVendor.name}</h2>
                <button
                  onClick={() => window.print()}
                  className="border border-border text-ink-3 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-colors">
                  Print Statement
                </button>
              </div>

              {/* Print-only header */}
              <div className="hidden print:block mb-6">
                <h1 className="font-display font-bold text-[22px]">Vendor Statement</h1>
                <p className="text-[14px] text-ink-3 mt-1">{selectedVendor.name}</p>
                <p className="text-[13px] text-ink-3">Period: {fmtDate(from)} – {fmtDate(to)}</p>
              </div>

              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 bg-bg border-b border-border print:hidden">
                  <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider">
                    {bookings.length} booking{bookings.length !== 1 ? 's' : ''} · {fmtDate(from)} – {fmtDate(to)}
                  </p>
                </div>
                <table className="w-full text-[13px]">
                  <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      {['Ref','Vehicle','Hire Type','Start','End','Days','Amount','Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 first:pl-6 last:pr-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} className="border-t border-border">
                        <td className="pl-6 pr-4 py-3 font-mono font-bold text-accent text-[12.5px]">{b.public_id}</td>
                        <td className="px-4 py-3 font-medium">{b.vehicle_name ?? '—'}</td>
                        <td className="px-4 py-3 text-ink-3 capitalize">{b.hire_type.replace('-', ' ')}</td>
                        <td className="px-4 py-3 text-ink-3 whitespace-nowrap text-[12px]">{fmtDate(b.start_date)}</td>
                        <td className="px-4 py-3 text-ink-3 whitespace-nowrap text-[12px]">{fmtDate(b.end_date)}</td>
                        <td className="px-4 py-3 text-ink-3">{b.total_days}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(b.total_cost)}</td>
                        <td className="px-4 pr-6 py-3 capitalize text-ink-3">{b.status}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-bg">
                      <td colSpan={6} className="pl-6 pr-4 py-3 font-semibold text-ink-3">
                        Total ({bookings.length} booking{bookings.length !== 1 ? 's' : ''})
                      </td>
                      <td className="px-4 py-3 font-bold text-[14px]">{formatCurrency(totalRevenue)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
