import { prisma } from '@/lib/db'
import Nav from './Nav'

export default async function NavWrapper() {
  let logoUrl: string | undefined

  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'logo_path' } })
    if (setting?.value) logoUrl = '/api/logo'
  } catch {
    // DB not ready or no logo set — fall back to default
  }

  return <Nav logoUrl={logoUrl} />
}
