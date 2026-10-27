'use client'
import { useState } from 'react'
import Link from 'next/link'

import type { Vehicle, FleetCategory } from '@/types'
import { formatCurrency, getVehicleImage } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { filterFleetVehicles } from '@/lib/service-buttons'

const filters = [
  { key: 'all', label: 'All' },
  { key: 'selfdrive', label: 'Self-Drive' },
]

export default function MobileVehicleList({ vehicles, initialFilter = 'all', categories = [] }: { vehicles: Vehicle[]; initialFilter?: string; categories?: FleetCategory[] }) {
  const [active, setActive] = useState(initialFilter)
  const filtered = filterFleetVehicles(vehicles, active)

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[...filters, ...categories.map(category => ({ key: `category:${category.id}`, label: category.name }))].map(f => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className={cn(
              'px-4 py-2 rounded-full border text-[13px] font-semibold transition-all',
              active === f.key
                ? 'bg-ink text-white border-ink'
                : 'border-border text-ink-3 bg-white hover:border-ink-3'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Vehicle list */}
      {filtered.length === 0 ? (
        <p className="text-ink-3 text-[15px] text-center py-10">No vehicles found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => <MobileVehicleCard key={v.id} vehicle={v} />)}
        </div>
      )}
    </div>
  )
}

function MobileVehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const img = getVehicleImage(vehicle)
  const isChauffeured = vehicle.meta.hire_modes === 'chauffeured_only'
  const fromPrice = isChauffeured ? vehicle.chauffeur_price : vehicle.price

  return (
    <Link
      href={`/book/hire/${vehicle.slug}`}
      className="flex bg-white border border-border rounded-xl overflow-hidden shadow-card active:scale-[0.99] transition-transform"
    >
      {/* Image */}
      <div className="w-[110px] flex-shrink-0 bg-slate relative overflow-hidden flex items-center justify-center">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={vehicle.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-4xl opacity-30">🚗</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 px-4 py-3.5 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display font-bold text-[15px] tracking-tight leading-tight">{vehicle.name}</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 text-white ${vehicle.meta.hire_modes === 'both' ? 'bg-emerald-700' : 'bg-accent'}`}>{vehicle.meta.hire_modes === 'both' ? 'Self-Drive' : 'Chauffeur Only'}</span>
        </div>

        {/* Specs */}
        <div className="flex gap-2 flex-wrap text-[11.5px] text-ink-4 mb-2">
          {vehicle.meta.passengers && <span>👥 {vehicle.meta.passengers}</span>}
          {vehicle.meta.transmission && <span>⚙️ {vehicle.meta.transmission}</span>}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-display font-extrabold text-[17px]">{formatCurrency(fromPrice)}</span>
            <span className="text-[11px] text-ink-4">/day</span>
          </div>
          <span className="text-[12px] font-semibold text-accent">{vehicle.enquiry_only ? 'Enquire →' : 'Book →'}</span>
        </div>
      </div>
    </Link>
  )
}
