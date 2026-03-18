import { query } from '@/lib/db'
import BlockoutsClient from './BlockoutsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Blockouts' }
export const revalidate = 0

export default async function BlockoutsPage() {
  const vehicles = await query<{ id: string; name: string }>(
    'SELECT id, name FROM Vehicle ORDER BY name ASC'
  )

  return (
    <div className="px-10 py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Blockouts</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">
          Manage date ranges during which vehicles cannot be booked. Block individual vehicles or close the entire fleet.
        </p>
      </div>
      <BlockoutsClient vehicles={vehicles} />
    </div>
  )
}
