import { getVendorSession } from '@/lib/vendor-auth'
import { queryOne } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const revalidate = 0

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `Booking ${params.id.slice(0, 8)}` }
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Your booking request has been received and is awaiting confirmation from our team.',
  confirmed: 'This booking has been confirmed. Our driver will be in touch closer to the date.',
  completed: 'This trip has been completed. Thank you for your business.',
  cancelled: 'This booking has been cancelled.',
}

export default async function VendorBookingDetailPage({ params }: { params: { id: string } }) {
  const session = await getVendorSession()
  if (!session) redirect('/vendor/login')

  const booking = await queryOne<{
    id: string; public_id: string; status: string; created_at: Date | string
    start_date: string; end_date: string; total_days: number
    daily_rate: number; total_cost: number; vehicle_id?: string | null
    service_type?: string; contact_name?: string; contact_email?: string; contact_phone?: string
    vehicle_name?: string
    vc_id?: string; vc_name?: string; vc_email?: string; vc_phone?: string; vc_reference?: string
  }>(
    'SELECT b.id, b.public_id, b.status, b.created_at, b.start_date, b.end_date, b.total_days, b.daily_rate, b.total_cost, b.vehicle_id, b.service_type, b.contact_name, b.contact_email, b.contact_phone, b.vendor_client_id, v.name as vehicle_name, vc.id as vc_id, vc.name as vc_name, vc.email as vc_email, vc.phone as vc_phone, vc.reference as vc_reference FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id WHERE b.id = ? AND b.vendor_id = ? LIMIT 1',
    [params.id, session.vendorId]
  )

  if (!booking) notFound()

  const vendor_client = booking.vc_id ? {
    id: booking.vc_id, name: booking.vc_name, email: booking.vc_email,
    phone: booking.vc_phone, reference: booking.vc_reference,
  } : null

  const row = (label: string, value: string | null | undefined) => (
    <div className="flex justify-between py-2.5 border-b border-border last:border-0 text-[13.5px]">
      <span className="text-ink-3">{label}</span>
      <span className="font-medium text-ink">{value || '—'}</span>
    </div>
  )

  const dailyRateDollars = booking.daily_rate / 100
  const totalCostDollars = booking.total_cost / 100

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/vendor/bookings" className="text-[13px] text-ink-3 hover:text-accent transition-colors">← Bookings</Link>
          </div>
          <h1 className="font-display font-bold text-[26px] tracking-tight font-mono">{booking.public_id}</h1>
          <p className="text-[13.5px] text-ink-3 mt-0.5">
            Submitted {new Date(booking.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold border ${STATUS_COLORS[booking.status] ?? 'bg-bg text-ink-3 border-border'}`}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
      </div>

      {/* Status message */}
      {STATUS_MESSAGES[booking.status] && (
        <div className={`rounded-xl border px-5 py-4 mb-6 text-[13.5px] ${STATUS_COLORS[booking.status] ?? 'bg-bg border-border text-ink-3'}`}>
          {STATUS_MESSAGES[booking.status]}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">

          {/* Trip */}
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-3">Trip</p>
            {row('Service',
              booking.service_type === 'taxi' ? 'Taxi (metered)' :
              booking.service_type === 'cpv'  ? 'CPV (pre-agreed rate)' :
              booking.vehicle_name ?? 'Vehicle'
            )}
            {row('Start date', booking.start_date)}
            {row('End date', booking.end_date)}
            {row('Duration', `${booking.total_days} day${booking.total_days !== 1 ? 's' : ''}`)}
          </div>

          {/* Passenger */}
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-3">Passenger</p>
            {vendor_client ? (
              <>
                {row('Name', vendor_client.name)}
                {row('Email', vendor_client.email)}
                {row('Phone', vendor_client.phone)}
                {row('Reference', vendor_client.reference)}
                <div className="pt-2">
                  <Link href={`/vendor/clients/${vendor_client.id}`}
                    className="text-[12.5px] text-accent hover:underline font-medium">
                    View client record →
                  </Link>
                </div>
              </>
            ) : (
              <>
                {row('Name', booking.contact_name)}
                {row('Email', booking.contact_email)}
                {row('Phone', booking.contact_phone)}
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Cost */}
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-3">Cost</p>
            {booking.daily_rate === 0 && !booking.vehicle_id ? (
              <p className="text-[13.5px] text-ink-3">Cost to be advised — our team will confirm the rate for this trip.</p>
            ) : (
              <div className="space-y-2 text-[13.5px]">
                <div className="flex justify-between text-ink-3">
                  <span>Daily rate</span><span>${dailyRateDollars.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-3">
                  <span>Days</span><span>{booking.total_days}</span>
                </div>
                <div className="flex justify-between font-bold text-ink border-t border-border pt-2 mt-2">
                  <span>Total</span><span className="text-[16px] font-display">${totalCostDollars.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Need help */}
          <div className="bg-accent-bg border border-accent/20 rounded-xl p-5">
            <p className="font-semibold text-[13.5px] text-ink mb-1">Need help with this booking?</p>
            <p className="text-[12.5px] text-ink-3 mb-3">Our team is here to assist with any queries or changes.</p>
            <Link href={`/vendor/support?booking=${booking.id}`}
              className="inline-block bg-accent text-white text-[13px] font-semibold px-4 py-2 rounded-[6px] hover:bg-accent-dark transition-colors">
              Contact support →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
