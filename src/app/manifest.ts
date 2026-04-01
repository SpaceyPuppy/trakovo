import type { MetadataRoute } from 'next'
import { getSiteName } from '@/lib/site'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const siteName = await getSiteName()

  return {
    name: siteName,
    short_name: siteName,
    description: 'Book a ride, hire a vehicle, or schedule a chauffeur.',
    start_url: '/book',
    scope: '/book',
    display: 'standalone',
    background_color: '#f7f6f3',
    theme_color: '#1e2330',
    orientation: 'portrait',
    icons: [
      {
        src: '/api/icons/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/icons/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
