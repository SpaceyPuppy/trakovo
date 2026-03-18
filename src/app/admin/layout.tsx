import AdminShell from './AdminShell'
import { getAdminName, getLogoUrl } from '@/lib/site'
import { getAdminSession } from '@/lib/auth'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const adminName = await getAdminName()
  return { title: { default: 'Dashboard', template: `%s | ${adminName}` } }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [adminName, logoUrl, session] = await Promise.all([
    getAdminName(),
    getLogoUrl(),
    getAdminSession(),
  ])
  const username = session?.username ?? 'Admin'
  return (
    <AdminShell adminName={adminName} logoUrl={logoUrl} username={username}>
      {children}
    </AdminShell>
  )
}
