import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!configuredUrl) return []
  const base = configuredUrl.replace(/\/$/, '')
  return ['', '/special-occasions', '/services', '/vehicles', '/contact'].map(route => ({
    url: `${base}${route}`,
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))
}
