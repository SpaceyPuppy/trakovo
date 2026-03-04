import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: process.env.NEXT_PUBLIC_SITE_NAME ?? 'Trakovo', template: `%s | ${process.env.NEXT_PUBLIC_SITE_NAME ?? 'Trakovo'}` },
  description: 'Professional vehicle hire — chauffeured and self-drive options available.',
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
