import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: { default: 'Book a Vehicle', template: '%s | Book' },
  description: 'Browse and book premium vehicles from your phone.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: process.env.NEXT_PUBLIC_SITE_NAME ?? 'Trakovo',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#1e2330',
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {children}
    </div>
  )
}
