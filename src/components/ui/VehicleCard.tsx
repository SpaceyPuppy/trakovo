import Link from 'next/link'
import Image from 'next/image'
import type { Vehicle } from '@/types'
import { formatCurrency, getVehicleImage } from '@/lib/utils'

export default function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const img = getVehicleImage(vehicle)
  const isChauffeured = vehicle.meta.hire_modes === 'chauffeured_only'

  return (
    <Link href={`/vehicles/${vehicle.slug}`} className="group block bg-white border border-border rounded-xl overflow-hidden shadow-card hover:shadow-card-lg hover:-translate-y-1 transition-all duration-200">
      {/* Image */}
      <div className="h-[190px] bg-slate relative overflow-hidden flex items-center justify-center">
        {img ? (
          <Image src={img} alt={vehicle.name} fill className="object-cover" />
        ) : (
          <span className="text-6xl opacity-40">🚗</span>
        )}
        <span className={`absolute top-3 right-3 text-[10.5px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full ${isChauffeured ? 'bg-accent text-white' : 'bg-white/15 text-white border border-white/20'}`}>
          {isChauffeured ? 'Chauffeur Only' : 'Chauffeur / Self-Drive'}
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        {vehicle.category && (
          <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider mb-1">{vehicle.category.name}</p>
        )}
        <h3 className="font-display font-bold text-[17px] tracking-tight mb-2.5">{vehicle.name}</h3>

        {/* Specs row */}
        <div className="flex gap-3 flex-wrap mb-4 text-[12.5px] text-ink-3">
          {vehicle.meta.passengers && <span>👥 {vehicle.meta.passengers} pax</span>}
          {vehicle.meta.transmission && <span>⚙️ {vehicle.meta.transmission}</span>}
          {vehicle.meta.fuel && <span>⛽ {vehicle.meta.fuel}</span>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-border">
          <div className="font-display font-bold text-[20px]">
            {formatCurrency(vehicle.price)}
            <sub className="font-body font-normal text-[12px] text-ink-4">/day</sub>
          </div>
          <span className="bg-ink text-white text-[13px] font-semibold px-4 py-2 rounded-[6px] group-hover:bg-slate transition-colors">
            Book Now
          </span>
        </div>
      </div>
    </Link>
  )
}
