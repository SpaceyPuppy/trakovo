import { queryOne } from '@/lib/db'
import { getSiteName } from '@/lib/site'
import Nav from './Nav'

export default async function NavWrapper() {
  let logoUrl: string | undefined
  const siteName = await getSiteName()

  try {
    const setting = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['logo_path'])
    if (setting?.value) logoUrl = '/api/logo'
  } catch {
    // DB not ready or no logo set — fall back to default
  }

  return <Nav logoUrl={logoUrl} siteName={siteName} />
}
