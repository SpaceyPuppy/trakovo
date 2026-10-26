import { getLogoUrl, getSiteName } from '@/lib/site'
import { connection } from 'next/server'
import Nav from './Nav'

export default async function NavWrapper() {
  // Branding is database-backed and must be read on the host, not baked in by CI.
  await connection()
  const [siteName, logoUrl] = await Promise.all([getSiteName(), getLogoUrl()])

  return <Nav logoUrl={logoUrl} siteName={siteName} />
}
