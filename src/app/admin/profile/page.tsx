import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminProfileForm from './AdminProfileForm'
import type { Metadata } from 'next'

export const revalidate = 0
export const metadata: Metadata = { title: 'Profile Settings' }

export default async function AdminProfilePage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const isMaster = session.username === process.env.ADMIN_USERNAME

  return (
    <div className="px-10 py-10 max-w-[640px]">
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Profile Settings</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Manage your admin account.</p>
      </div>
      <AdminProfileForm username={session.username} isMaster={isMaster} />
    </div>
  )
}
