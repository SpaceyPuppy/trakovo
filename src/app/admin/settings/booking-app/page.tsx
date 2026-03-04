import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Booking App' }

export default function BookingAppPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? ''
  const bookingUrl = `${siteUrl}/book`

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-bg">
          <h3 className="font-display font-bold text-[14px]">Mobile Booking App</h3>
          <p className="text-[12.5px] text-ink-3 mt-0.5">Share this QR code for customers to scan and book directly from their phone.</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* QR code */}
            <div className="flex-shrink-0 border border-border rounded-xl p-3 bg-white inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/admin/qr" alt="Mobile booking QR code" width={160} height={160} className="block" />
            </div>
            {/* Instructions */}
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-[12px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5">Booking URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-bg border border-border rounded-[6px] px-3 py-2 text-[13px] text-ink font-mono break-all">
                    {bookingUrl}
                  </code>
                  <a
                    href="/book"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 border border-border text-ink-3 font-semibold text-[12px] px-3 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all whitespace-nowrap">
                    Preview ↗
                  </a>
                </div>
              </div>
              <div className="space-y-2 text-[13px] text-ink-3">
                <p className="flex gap-2"><span className="font-semibold text-ink w-5 flex-shrink-0">1.</span>Print or display the QR code at your office or event.</p>
                <p className="flex gap-2"><span className="font-semibold text-ink w-5 flex-shrink-0">2.</span>Customers scan it with their phone camera.</p>
                <p className="flex gap-2"><span className="font-semibold text-ink w-5 flex-shrink-0">3.</span>They land on a mobile-optimised booking experience.</p>
              </div>
              <a
                href="/api/admin/qr"
                download="booking-qr.svg"
                className="inline-flex items-center gap-1.5 border border-border text-ink-3 font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all">
                ↓ Download QR Code (SVG)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
