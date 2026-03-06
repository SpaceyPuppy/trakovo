import AdminShell from './AdminShell'
import { getAdminName } from '@/lib/site'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const adminName = await getAdminName()
  return { title: { default: 'Dashboard', template: `%s | ${adminName}` } }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminName = await getAdminName()
  return <AdminShell adminName={adminName}>{children}</AdminShell>
}
