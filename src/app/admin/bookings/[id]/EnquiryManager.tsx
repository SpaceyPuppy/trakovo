'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PortalIcon from '@/components/ui/PortalIcon'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:       { label: 'New',       color: 'bg-purple-50 text-purple-700 border-purple-200' },
  contacted: { label: 'Contacted', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  converted: { label: 'Converted', color: 'bg-success-bg text-success border-success/30' },
  lost:      { label: 'Lost',      color: 'bg-red-50 text-red-600 border-red-200' },
}

interface Props {
  bookingId: string
  vehicleName: string
  enquiryStatus: string
}

export default function EnquiryManager({ bookingId, vehicleName, enquiryStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(enquiryStatus)
  const [busy, setBusy] = useState<string | null>(null)
  const [notified, setNotified] = useState(false)

  async function act(action: string) {
    setBusy(action)
    const res = await fetch(`/api/admin/bookings/${bookingId}/enquiry`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    setBusy(null)

    if (!res.ok) return alert(data.error ?? 'Something went wrong')

    if (action === 'converted') {
      router.refresh()
    } else if (action === 'notify') {
      setNotified(true)
      if (status === 'new') setStatus('contacted')
    } else {
      setStatus(data.enquiry_status)
    }
  }

  const badge = STATUS_LABELS[status] ?? STATUS_LABELS.new

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <PortalIcon name="clipboard-list" size={20} className="text-purple-500 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-purple-800 text-[14px]">Waitlist Enquiry</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wide ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-[13px] text-purple-700">
              This customer enquired because their preferred dates were unavailable.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {status !== 'contacted' && status !== 'converted' && status !== 'lost' && (
            <button
              onClick={() => act('contacted')}
              disabled={!!busy}
              className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[6px] border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50">
              {busy === 'contacted' ? 'Saving…' : 'Mark Contacted'}
            </button>
          )}

          <button
            onClick={() => act('notify')}
            disabled={!!busy || notified}
            className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[6px] border border-purple-300 bg-white text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50">
            {notified ? 'Notified ✓' : busy === 'notify' ? 'Sending…' : 'Notify Customer'}
          </button>

          {status !== 'converted' && (
            <button
              onClick={() => { if (confirm('Convert this enquiry to a pending booking?')) act('converted') }}
              disabled={!!busy}
              className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[6px] border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50">
              {busy === 'converted' ? 'Converting…' : 'Convert to Booking'}
            </button>
          )}

          {status !== 'lost' && status !== 'converted' && (
            <button
              onClick={() => { if (confirm('Mark this enquiry as lost?')) act('lost') }}
              disabled={!!busy}
              className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[6px] border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
              {busy === 'lost' ? 'Saving…' : 'Mark Lost'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
