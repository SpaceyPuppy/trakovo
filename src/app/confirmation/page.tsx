import Link from 'next/link'
import dynamic from 'next/dynamic'
import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import { queryOne } from '@/lib/db'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Metadata } from 'next'

const ConfirmationUploadCard = dynamic(() => import('@/components/booking/ConfirmationUploadCard'))

export const revalidate = 0
export const metadata: Metadata = { title: 'Booking Confirmed' }

interface Props { searchParams: Record<string, string> }
interface Booking {
  id: string
  public_id: string
  vehicle_id: string
  hire_type: string
  is_enquiry: number
  start_date: string
  end_date: string
  total_cost: number
  contact_name: string | null
  contact_email: string
  contact_phone: string
}

export default async function ConfirmationPage({ searchParams: sp }: Props) {
  const publicId = sp.ref ?? ''
  const isEnquiry = sp.enquiry === 'true'

  let booking: Booking | null = null
  let vehicleName = '—'

  if (publicId) {
    const result = await queryOne<Booking & { name: string }>(
      'SELECT b.*, v.name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.public_id = ? LIMIT 1',
      [publicId]
    )
    if (result) {
      booking = result
      vehicleName = result.name || '—'
    }
  }

  const ref = publicId || '—'
  const isDry = booking?.hire_type === 'dry-hire'
  const startDate = booking ? formatDate(new Date(booking.start_date)) : '—'
  const endDate = booking ? formatDate(new Date(booking.end_date)) : '—'
  const total = booking ? formatCurrency(booking.total_cost / 100) : null

  const rows = [
    ['Vehicle', vehicleName],
    ['Hire Type', isDry ? 'Dry Hire (Self-Drive)' : 'Chauffeured'],
    ['Start Date', startDate],
    ['End Date', endDate],
    total ? ['Estimated Total', total] : null,
    ['Name', booking?.contact_name ?? '—'],
    ['Email', booking?.contact_email ?? '—'],
    ['Phone', booking?.contact_phone ?? '—'],
  ].filter(Boolean) as string[][]

  return (
    <>
      <NavWrapper />
      <main className="max-w-[640px] mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-16 pb-16 md:pb-20 text-center animate-fade-up">
        <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center text-[30px] mx-auto mb-6 animate-pop-in ${isEnquiry ? 'bg-amber-50 border-2 border-amber-400' : 'bg-success-bg border-2 border-success'}`}>
          {isEnquiry ? '📋' : '✓'}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-4 mb-2">
          {isEnquiry ? 'Waitlist Enquiry Received' : 'Booking Request Received'}
        </p>
        <h1 className="font-display font-extrabold text-[36px] tracking-tight mb-2">{ref}</h1>
        <p className="text-[15px] text-ink-3 font-light mb-9">
          {isEnquiry
            ? "You're on the waitlist for this vehicle. We'll contact you as soon as the vehicle becomes available for your dates."
            : 'Your request has been sent. Our team will be in touch shortly to confirm your booking.'}
        </p>

        {/* Summary card */}
        <div className="bg-white border border-border rounded-xl px-7 py-6 text-left mb-5 shadow-card">
          {rows.map(([key, val]) => (
            <div key={key} className="flex justify-between py-2.5 border-b border-border last:border-0 text-[14px]">
              <span className="text-ink-3">{key}</span>
              <span className={`font-semibold text-right ${key === 'Estimated Total' ? 'text-accent text-[16px]' : 'text-ink'}`}>{val}</span>
            </div>
          ))}
        </div>

        {/* Optional ID upload — dry-hire only */}
        {isDry && !isEnquiry && booking && <ConfirmationUploadCard bookingRef={booking.public_id} />}

        {/* Next steps */}
        <div className="bg-bg rounded-xl px-6 py-5 text-left mb-7">
          <p className="font-display font-bold text-[15px] mb-3.5">What happens next?</p>
          {(isEnquiry ? [
            'Your enquiry is logged and our team is notified immediately.',
            'If the vehicle becomes available due to a cancellation, we\'ll contact you right away.',
            'You\'ll get priority confirmation over any new bookings for your preferred dates.',
          ] : [
            'Our team reviews your booking request and checks final availability.',
            'We\'ll contact you within a few hours to confirm details and arrange payment.',
            isDry
              ? 'We\'ll verify your licence and ID before finalising the booking.'
              : 'Your driver will be assigned and will contact you prior to the booking date.',
          ]).map((step, i) => (
            <div key={i} className="flex gap-3 mb-2.5 last:mb-0 text-[13.5px] text-ink-2">
              <span className="w-[22px] h-[22px] rounded-full bg-ink text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        <Link href="/vehicles" className="w-full bg-ink text-white font-display font-bold text-[14.5px] py-3.5 rounded-[6px] flex items-center justify-center gap-2 hover:bg-slate transition-colors">
          ← Back to Fleet
        </Link>
      </main>
      <Footer />
    </>
  )
}
