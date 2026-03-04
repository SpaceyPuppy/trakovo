import type { Metadata, Viewport } from 'next'
import { getSiteName } from '@/lib/site'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName()
  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    description: 'Professional vehicle hire — chauffeured and self-drive options available.',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1e2330',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
