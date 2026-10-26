import Link from 'next/link'
import type { Metadata } from 'next'
import { getFleetCategories } from '@/lib/fleet-categories'
import CategoryManager from './CategoryManager'

export const metadata: Metadata = { title: 'Fleet Categories' }
export const revalidate = 0

export default async function FleetCategoriesPage() {
  const categories = await getFleetCategories()
  return <main className="px-4 md:px-10 py-10 max-w-[1000px]">
    <Link href="/admin/vehicles" className="text-[13px] text-ink-3 hover:text-ink">← Back to Vehicles</Link>
    <h1 className="font-display font-bold text-[26px] mt-6 mb-3">Fleet Categories</h1>
    <p className="text-[14px] text-ink-3 leading-relaxed mb-6">Create categories for your public fleet, then assign them when editing a vehicle. Choose a homepage group to bring matching vehicles to the top when someone selects that tile.</p>
    <div className="rounded-xl border border-border bg-bg p-5 mb-6">
      <p className="font-semibold text-[14px] mb-2">Built-in filters</p>
      <p className="text-[13px] text-ink-3">Chauffeur Only · Self-Drive Available</p>
      <p className="text-[12px] text-ink-4 mt-2">These stay available and are determined by each vehicle’s hire modes.</p>
    </div>
    <CategoryManager initialCategories={categories} />
  </main>
}
