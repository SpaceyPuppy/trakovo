import AdminSidebar from './AdminSidebar'
import { getAdminName } from '@/lib/site'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const adminName = await getAdminName()
  return { title: { default: 'Dashboard', template: `%s | ${adminName}` } }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminName = await getAdminName()
  return (
    <div className="flex min-h-screen bg-[#f0efe9]">
      <AdminSidebar adminName={adminName} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
