import { query } from '@/lib/db'
import ReportsClient from './ReportsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reports' }
export const revalidate = 0

export default async function ReportsPage() {
  const vendors = await query<{ id: string; name: string }>(
    'SELECT id, name FROM Vendor WHERE is_active = 1 ORDER BY name ASC'
  )
  return (
    <div className="px-10 py-10">
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Reports</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Revenue summaries and vendor statements.</p>
      </div>
      <ReportsClient vendors={vendors} />
    </div>
  )
}
