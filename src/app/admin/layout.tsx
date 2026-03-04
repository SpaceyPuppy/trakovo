import AdminSidebar from './AdminSidebar'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: { default: 'Dashboard', template: `%s | ${process.env.NEXT_PUBLIC_ADMIN_NAME ?? 'Hire Manager'}` } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f0efe9]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
