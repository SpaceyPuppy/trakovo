import type { Metadata, Viewport } from 'next'
import { getSiteName } from '@/lib/site'

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName()
  return {
    title: { default: 'Book a Ride', template: '%s | CKB' },
    description: 'Book a taxi, hire a vehicle, or schedule a chauffeur.',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: siteName,
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#1e2330',
}

// Status bar icons (visual dressing for desktop phone frame)
function StatusBarIcons() {
  return (
    <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
      {/* Signal bars */}
      <svg width="17" height="12" viewBox="0 0 17 12">
        <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="currentColor" />
        <rect x="9" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
        <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="currentColor" />
      </svg>
      {/* Wifi */}
      <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
        <circle cx="8" cy="10.5" r="1.5" />
        <path d="M5.05 7.55a4.15 4.15 0 0 1 5.9 0l1.2-1.2a5.9 5.9 0 0 0-8.3 0l1.2 1.2z" />
        <path d="M2.5 5a7.7 7.7 0 0 1 11 0l1.2-1.2a9.5 9.5 0 0 0-13.4 0L2.5 5z" />
      </svg>
      {/* Battery */}
      <div className="flex items-center gap-[1px]">
        <div style={{ width: '22px', height: '11px', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '3px', padding: '1.5px', display: 'flex', alignItems: 'stretch' }}>
          <div style={{ width: '78%', backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: '1px' }} />
        </div>
        <div style={{ width: '2px', height: '5px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '1px' }} />
      </div>
    </div>
  )
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── MOBILE: full screen ── */}
      <div className="lg:hidden min-h-dvh bg-[#f7f6f3] flex flex-col">
        {children}
      </div>

      {/* ── DESKTOP: phone frame ── */}
      <div className="hidden lg:flex min-h-screen items-center justify-center p-10"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a1e2e 0%, #0a0c12 100%)' }}>

        {/* Device wrapper (relative for side buttons outside the phone body) */}
        <div className="relative">
          {/* Volume up */}
          <div className="absolute rounded-l-full" style={{ left: '-9px', top: '100px', width: '4px', height: '30px', background: '#1a1d26' }} />
          {/* Volume down */}
          <div className="absolute rounded-l-full" style={{ left: '-9px', top: '146px', width: '4px', height: '30px', background: '#1a1d26' }} />
          {/* Power */}
          <div className="absolute rounded-r-full" style={{ right: '-9px', top: '120px', width: '4px', height: '44px', background: '#1a1d26' }} />

          {/* Phone body */}
          <div
            className="relative flex flex-col overflow-hidden"
            style={{
              width: '390px',
              height: '844px',
              borderRadius: '50px',
              border: '5px solid #1a1d26',
              boxShadow: '0 48px 140px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.04)',
              background: '#1e2330',
            }}
          >
            {/* Dynamic island */}
            <div className="absolute z-30 pointer-events-none"
              style={{ top: '13px', left: '50%', transform: 'translateX(-50%)', width: '90px', height: '26px', background: 'black', borderRadius: '9999px' }} />

            {/* Status bar */}
            <div className="flex items-end justify-between shrink-0 pointer-events-none"
              style={{ height: '52px', padding: '0 24px 8px', background: 'transparent' }}>
              <span style={{ fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>9:41</span>
              <StatusBarIcons />
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto" style={{ background: '#f7f6f3' }}>
              {children}
            </div>

            {/* Home indicator */}
            <div className="shrink-0 flex items-center justify-center" style={{ height: '34px', background: '#f7f6f3' }}>
              <div style={{ width: '100px', height: '4px', background: 'rgba(0,0,0,0.12)', borderRadius: '9999px' }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
