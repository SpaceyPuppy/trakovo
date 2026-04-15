import Link from 'next/link'
import { notFound } from 'next/navigation'
import { queryOne, query } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import BookingStatusUpdater from '../BookingStatusUpdater'
import BookingDetailEditor from './BookingDetailEditor'
import BookingNotes from './BookingNotes'
import BookingDeleteButton from './BookingDeleteButton'
import DriverAssigner from './DriverAssigner'
import EnquiryManager from './EnquiryManager'
import BookingInvoiceSection from './BookingInvoiceSection'
import type { Metadata } from 'next'

export const revalidate = 0

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const booking = await queryOne<{ public_id: string }>('SELECT public_id FROM Booking WHERE id = ? LIMIT 1', [params.id])
  return { title: booking ? `Booking ${booking.public_id}` : 'Booking' }
}

export default async function BookingDetailPage({ params }: Props) {
  const [booking, activeDrivers, notes, invoice] = await Promise.all([
    queryOne<{
      id: string; public_id: string; status: string; hire_type: string; service_type: string | null;
      is_enquiry: number; enquiry_status: string | null; start_date: string; end_date: string; total_days: number;
      daily_rate: number; total_cost: number; contact_name: string | null;
      contact_email: string; contact_phone: string; driver_name: string | null;
      driver_dob: string | null; driver_licence_number: string | null;
      driver_licence_expiry: string | null; id_document_path: string | null;
      licence_document_path: string | null; driver_id: string | null;
      created_at: Date; vehicle_name: string | null;
    }>(
      'SELECT b.*, v.name as vehicle_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.id = ? LIMIT 1',
      [params.id]
    ),
    query<{ id: string; name: string }>(
      'SELECT id, name FROM Driver WHERE is_active = 1 ORDER BY name ASC'
    ),
    query<{ id: string; text: string; author: string; created_at: Date }>(
      'SELECT id, text, author, created_at FROM BookingNote WHERE booking_id = ? ORDER BY created_at ASC',
      [params.id]
    ),
    queryOne<{ id: string; public_id: string; status: string }>(
      'SELECT id, public_id, status FROM Invoice WHERE booking_id = ? LIMIT 1',
      [params.id]
    ),
  ])
  if (!booking) notFound()

  const isDryHire = booking.hire_type === 'dry-hire'
  const isEnquiry = Boolean(booking.is_enquiry)
  const customerName = booking.contact_name ?? booking.driver_name ?? '—'

  const idDocUrl = booking.id_document_path ? `/api/uploads/${booking.id_document_path}` : null
  const licDocUrl = booking.licence_document_path ? `/api/uploads/${booking.licence_document_path}` : null

  return (
    <div className="px-10 py-10 max-w-[860px]">
      {/* Back */}
      <Link href="/admin/bookings" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-7">
        ← Back to Bookings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-mono font-bold text-accent text-[15px]">{booking.public_id}</p>
            {isEnquiry && (
              <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Enquiry
              </span>
            )}
          </div>
          <h1 className="font-display font-bold text-[26px] tracking-tight">{booking.service_type === 'taxi' ? 'Taxi Request' : (booking.vehicle_name ?? '—')}</h1>
          <p className="text-[13px] text-ink-3 mt-0.5 capitalize">
            {booking.service_type === 'taxi' ? 'Taxi' : booking.hire_type.replace('-', ' ')} · Submitted {new Date(booking.created_at instanceof Date ? booking.created_at : String(booking.created_at)).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <BookingStatusUpdater bookingId={booking.id} currentStatus={booking.status} />
          <BookingDeleteButton bookingId={booking.id} />
        </div>
      </div>

      <div className="space-y-5">
        {/* Enquiry management */}
        {isEnquiry && (
          <EnquiryManager
            bookingId={booking.id}
            vehicleName={booking.vehicle_name ?? 'Vehicle'}
            enquiryStatus={booking.enquiry_status ?? 'new'}
          />
        )}

        {/* Booking summary */}
        <section className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-bg border-b border-border">
            <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider">Booking Details</p>
          </div>
          <div className="px-5 py-5 grid grid-cols-2 md:grid-cols-3 gap-5">
            <Info label="Hire Type" value={isDryHire ? 'Dry Hire (Self-Drive)' : 'Chauffeured Hire'} />
            <Info label="Start Date" value={formatDate(booking.start_date, { day: 'numeric', month: 'short', year: 'numeric' })} />
            <Info label="End Date" value={formatDate(booking.end_date, { day: 'numeric', month: 'short', year: 'numeric' })} />
            <Info label="Duration" value={`${booking.total_days} day${booking.total_days !== 1 ? 's' : ''}`} />
            <Info label="Daily Rate" value={formatCurrency(booking.daily_rate / 100)} />
            <Info label="Total Cost" value={formatCurrency(booking.total_cost / 100)} accent />
          </div>
        </section>

        {/* Contact / Driver */}
        <section className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-bg border-b border-border flex items-center justify-between">
            <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider">
              {isDryHire ? 'Driver Details' : 'Contact Details'}
            </p>
            <div className="flex gap-2">
              <a
                href={`mailto:${booking.contact_email}?subject=Re: Booking ${booking.public_id}`}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent border border-accent/30 bg-accent-bg px-2.5 py-1 rounded-[5px] hover:bg-accent hover:text-white transition-all"
              >
                ✉ Email
              </a>
              <a
                href={`tel:${booking.contact_phone}`}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-2 border border-border bg-white px-2.5 py-1 rounded-[5px] hover:border-ink hover:text-ink transition-all"
              >
                📞 Call
              </a>
            </div>
          </div>
          <div className="px-5 py-5 grid grid-cols-2 md:grid-cols-3 gap-5">
            <Info label="Name" value={customerName} />
            <Info label="Email" value={booking.contact_email} />
            <Info label="Phone" value={booking.contact_phone} />
            {isDryHire && booking.driver_dob && <Info label="Date of Birth" value={booking.driver_dob} />}
            {isDryHire && booking.driver_licence_number && <Info label="Licence Number" value={booking.driver_licence_number} />}
            {isDryHire && booking.driver_licence_expiry && <Info label="Licence Expiry" value={booking.driver_licence_expiry} />}
          </div>
          {(idDocUrl || licDocUrl) && (
            <div className="px-5 pb-5 flex gap-4">
              {idDocUrl && (
                <a href={idDocUrl} target="_blank" rel="noreferrer"
                  className="text-[13px] font-semibold text-accent hover:underline flex items-center gap-1.5">
                  📎 View ID Document
                </a>
              )}
              {licDocUrl && (
                <a href={licDocUrl} target="_blank" rel="noreferrer"
                  className="text-[13px] font-semibold text-accent hover:underline flex items-center gap-1.5">
                  📎 View Licence Scan
                </a>
              )}
            </div>
          )}
        </section>

        {/* Driver assignment */}
        <section className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-bg border-b border-border">
            <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider">Assigned Driver</p>
          </div>
          <div className="px-5 py-4">
            <DriverAssigner
              bookingId={booking.id}
              drivers={activeDrivers}
              currentDriverId={booking.driver_id ?? null}
            />
          </div>
        </section>

        {/* Pricing editor + customer email */}
        <BookingDetailEditor
          bookingId={booking.id}
          publicId={booking.public_id}
          vehicleName={booking.vehicle_name ?? '—'}
          totalDays={booking.total_days}
          currentDailyRate={booking.daily_rate / 100}
          currentTotalCost={booking.total_cost / 100}
          customerEmail={booking.contact_email}
          customerName={customerName}
        />

        {/* Invoice */}
        <BookingInvoiceSection bookingId={booking.id} invoice={invoice} />

        {/* Internal notes */}
        <BookingNotes
          bookingId={booking.id}
          initialNotes={notes.map(n => ({
            id: n.id,
            text: n.text,
            author: n.author,
            created_at: n.created_at instanceof Date ? n.created_at.toISOString() : String(n.created_at),
          }))}
        />
      </div>
    </div>
  )
}

function Info({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold text-ink-4 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`font-medium text-[14px] ${accent ? 'text-accent font-bold text-[16px]' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
