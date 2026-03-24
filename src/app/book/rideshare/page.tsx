import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Rideshare' }

export default function RidesharePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center" style={{ background: '#f7f6f3' }}>
      {/* Icon */}
      <div className="mb-5">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.06))', border: '1px solid rgba(251,191,36,0.2)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#141414', marginBottom: 8 }}>
        Coming soon
      </h1>
      <p style={{ fontSize: 12, color: '#717171', lineHeight: 1.6, maxWidth: '240px' }}>
        Rideshare is in development.{'\n'}Check back soon!
      </p>

      {/* Back button */}
      <Link
        href="/book"
        className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13.5px] font-semibold text-ink-2 transition-all"
        style={{
          background: 'white',
          border: '1px solid #e2e0db',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to ride picker
      </Link>
    </div>
  )
}
