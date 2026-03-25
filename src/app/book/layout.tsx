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

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f7f6f3]">
      {children}
    </div>
  )
}
