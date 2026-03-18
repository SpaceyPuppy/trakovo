'use client'
import { useState } from 'react'
import VehicleCard from '@/components/ui/VehicleCard'
import type { Vehicle } from '@/types'
import { cn } from '@/lib/utils'

const filters = [
  { key: 'all', label: 'All Vehicles' },
  { key: 'chauffeur', label: 'Chauffeur Only' },
  { key: 'selfdrive', label: 'Self-Drive Available' },
]

export default function FleetGrid({ vehicles, initialFilter = 'all' }: { vehicles: Vehicle[]; initialFilter?: string }) {
  const [active, setActive] = useState(initialFilter)

  const filtered = vehicles.filter(v => {
    if (active === 'chauffeur') return v.meta.hire_modes === 'chauffeured_only'
    if (active === 'selfdrive') return v.meta.hire_modes === 'both'
    return true
  })

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-9">
        {filters.map(f => (
          <button key={f.key} onClick={() => setActive(f.key)}
            className={cn('px-4 py-1.5 rounded-full border text-[13px] font-medium transition-all', active === f.key ? 'bg-ink text-white border-ink' : 'border-border text-ink-3 bg-white hover:border-ink hover:text-ink')}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-ink-3 text-[15px]">No vehicles found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(v => <VehicleCard key={v.id} vehicle={v} />)}
        </div>
      )}
    </>
  )
}
