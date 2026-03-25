'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// SVG icons for each service card
function TaxiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4570a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="10" width="22" height="11" rx="2" />
      <path d="M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
      <circle cx="7" cy="21" r="1.5" fill="#d4570a" stroke="none" />
      <circle cx="17" cy="21" r="1.5" fill="#d4570a" stroke="none" />
      <path d="M8 6h2M14 6h2" />
      <path d="M1 14h22" strokeOpacity="0.4" />
    </svg>
  )
}

function RideshareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a8a8a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="8" width="22" height="13" rx="2" />
      <path d="M5 8V5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
      <circle cx="7" cy="21" r="1.5" fill="#a8a8a8" stroke="none" />
      <circle cx="17" cy="21" r="1.5" fill="#a8a8a8" stroke="none" />
      <path d="M1 13h22" strokeOpacity="0.4" />
    </svg>
  )
}

function SelfDriveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M7 18v2M17 18v2" />
      <path d="M3 11h3M18 11h3" />
      <path d="M9 8h6M8 12h8" />
    </svg>
  )
}

function ChauffeurIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B62C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="3" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
      <polyline points="14 9 18 13 16 13 16 17 14 17" />
    </svg>
  )
}

function SiteLogo({ height, maxWidth = 140 }: { height: number; maxWidth?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/api/logo"
      alt=""
      style={{ height, maxWidth, objectFit: 'contain', display: 'block' }}
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
    />
  )
}

function Spinner() {
  return (
    <div style={{
      width: '22px', height: '22px',
      border: '2px solid rgba(255,255,255,0.1)',
      borderTopColor: '#d4570a',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function SplashScreen() {
  return (
    <div
      className="flex flex-col items-center justify-center flex-1"
      style={{ background: '#1e2330', minHeight: '100%' }}
    >
      <div className="flex flex-col items-center gap-4 book-fade">
        {/* Logo */}
        <SiteLogo height={72} maxWidth={200} />
        <div className="text-center">
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.2px' }}>
            Passenger Transport
          </p>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '60px' }}>
        <Spinner />
      </div>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface ServiceCard {
  key: string
  label: string
  subtitle: string
  icon: React.ReactNode
  href: string
  variant: 'dark' | 'light-green' | 'light-purple' | 'disabled'
}

function RideCard({ card }: { card: ServiceCard }) {
  const router = useRouter()

  const isDark = card.variant === 'dark'
  const isDisabled = card.variant === 'disabled'

  // Card background & border
  const cardStyle: React.CSSProperties = isDisabled
    ? {
        background: 'white',
        border: '1px solid #e2e0db',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
        opacity: 0.65,
        cursor: 'default',
        borderRadius: '16px',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '10px',
        position: 'relative' as const,
        flex: 1,
        minWidth: 0,
        userSelect: 'none' as const,
      }
    : isDark
    ? {
        background: 'linear-gradient(160deg, #262d40 0%, #1a2030 50%, #1e2636 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '10px',
        position: 'relative' as const,
        flex: 1,
        minWidth: 0,
        cursor: 'pointer',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }
    : {
        background: 'white',
        border: '1px solid #e2e0db',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
        borderRadius: '16px',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '10px',
        position: 'relative' as const,
        flex: 1,
        minWidth: 0,
        cursor: 'pointer',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }

  // Icon container accent colour
  const iconAccent =
    card.variant === 'dark'       ? 'rgba(212,87,10,0.18)'
    : card.variant === 'light-green'   ? 'rgba(29,158,117,0.12)'
    : card.variant === 'light-purple'  ? 'rgba(107,98,199,0.12)'
    : 'rgba(168,168,168,0.1)'

  const iconBorder =
    card.variant === 'dark'       ? '1px solid rgba(212,87,10,0.15)'
    : card.variant === 'light-green'   ? '1px solid rgba(29,158,117,0.15)'
    : card.variant === 'light-purple'  ? '1px solid rgba(107,98,199,0.15)'
    : '1px solid rgba(168,168,168,0.1)'

  const nameCl = isDark ? 'rgba(255,255,255,0.92)' : '#141414'
  const subtitleCl = isDark ? 'rgba(255,255,255,0.38)' : '#a8a8a8'

  function handleClick() {
    if (isDisabled) return
    router.push(card.href)
  }

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onMouseDown={e => {
        if (isDisabled) return
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'scale(0.96)'
      }}
      onMouseUp={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
      }}
      onTouchStart={e => {
        if (isDisabled) return
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'scale(0.96)'
      }}
      onTouchEnd={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
      }}
    >
      {/* Radial glow overlay (dark card) */}
      {isDark && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '16px', pointerEvents: 'none',
          background: 'radial-gradient(circle at 30% 20%, rgba(212,87,10,0.08), transparent 60%)',
        }} />
      )}

      {/* Coming soon badge */}
      {isDisabled && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'linear-gradient(135deg, #faeeda, #fac775)',
          color: '#854F0B',
          fontSize: '8px', fontWeight: 700,
          padding: '2px 6px', borderRadius: '9999px',
          boxShadow: '0 1px 3px rgba(186,117,23,0.15)',
          letterSpacing: '0.5px',
        }}>
          SOON
        </div>
      )}

      {/* Icon container */}
      <div style={{
        width: 48, height: 48,
        borderRadius: '14px',
        background: iconAccent,
        border: iconBorder,
        boxShadow: isDark ? '0 2px 8px rgba(212,87,10,0.12)' : undefined,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1,
      }}>
        {card.icon}
      </div>

      {/* Text */}
      <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: nameCl, lineHeight: 1.2 }}>
          {card.label}
        </p>
        <p style={{ fontSize: 10, color: subtitleCl, marginTop: 2, lineHeight: 1.3 }}>
          {card.subtitle}
        </p>
      </div>
    </div>
  )
}

export default function BookPage() {
  const [phase, setPhase] = useState<'splash' | 'picker'>('splash')

  useEffect(() => {
    const t = setTimeout(() => setPhase('picker'), 1500)
    return () => clearTimeout(t)
  }, [])

  if (phase === 'splash') {
    return (
      <div className="flex flex-col" style={{ minHeight: '100dvh', background: '#1e2330' }}>
        <SplashScreen />
      </div>
    )
  }

  const cards: ServiceCard[] = [
    {
      key: 'taxi',
      label: 'Taxi',
      subtitle: 'On-demand pickup',
      icon: <TaxiIcon />,
      href: '/book/taxi',
      variant: 'dark',
    },
    {
      key: 'rideshare',
      label: 'Rideshare',
      subtitle: 'Shared rides',
      icon: <RideshareIcon />,
      href: '/book/rideshare',
      variant: 'disabled',
    },
    {
      key: 'selfdrive',
      label: 'Self-Drive Hire',
      subtitle: 'Drive yourself',
      icon: <SelfDriveIcon />,
      href: '/book/hire?mode=selfdrive',
      variant: 'light-green',
    },
    {
      key: 'chauffeured',
      label: 'Chauffeured',
      subtitle: 'With a driver',
      icon: <ChauffeurIcon />,
      href: '/book/hire?mode=chauffeured',
      variant: 'light-purple',
    },
  ]

  return (
    <div className="book-screen flex flex-col" style={{ minHeight: '100dvh', background: '#f7f6f3' }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <p style={{ fontSize: 12, color: '#717171', fontWeight: 500, marginBottom: 2 }}>{getGreeting()}</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 19, color: '#141414', letterSpacing: '-0.3px' }}>
          Choose your ride
        </h1>
      </div>

      {/* 2×2 card grid */}
      <div className="flex-1 px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 h-full">
          {cards.map(card => (
            <RideCard key={card.key} card={card} />
          ))}
        </div>
      </div>

      {/* Footer branding */}
      <div className="px-5 py-4 flex items-center gap-3">
        <SiteLogo height={30} maxWidth={100} />
        <div>
          <p style={{ fontSize: 11, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#3a3a3a', lineHeight: 1.2 }}>
            CKB Passenger Transport
          </p>
          <p style={{ fontSize: 10, color: '#a8a8a8', lineHeight: 1.2 }}>Cohuna &amp; surrounds</p>
        </div>
      </div>
    </div>
  )
}
