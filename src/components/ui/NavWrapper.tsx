import { getLogoUrl, getSiteName } from '@/lib/site'
import Nav from './Nav'

export default async function NavWrapper() {
  const [siteName, logoUrl] = await Promise.all([getSiteName(), getLogoUrl()])

  return <Nav logoUrl={logoUrl} siteName={siteName} />
}
