import AdminShell from './AdminShell'
import { getAdminName, getLogoUrl } from '@/lib/site'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const adminName = await getAdminName()
  return { title: { default: 'Dashboard', template: `%s | ${adminName}` } }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [adminName, logoUrl] = await Promise.all([getAdminName(), getLogoUrl()])
  return <AdminShell adminName={adminName} logoUrl={logoUrl}>{children}</AdminShell>
}
