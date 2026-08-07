import Link from 'next/link'

import { adminGetVehicles } from '@/lib/api'
import { formatCurrency, getVehicleImage } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Vehicle } from '@/types'
import PortalIcon from '@/components/ui/PortalIcon'

export const metadata: Metadata = { title: 'Vehicles' }
export const revalidate = 0

export default async function AdminVehiclesPage() {
  let vehicles: Vehicle[] = []
  try { vehicles = await adminGetVehicles() } catch { /* show empty */ }

  return (
    <div className="px-10 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight">Vehicles</h1>
          <p className="text-[14px] text-ink-3 mt-0.5">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} in fleet</p>
        </div>
        <Link href="/admin/vehicles/new"
          className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors flex items-center gap-2">
          + Add Vehicle
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-16 text-center">
          <PortalIcon name="car-front" size={32} className="mx-auto mb-3 text-ink-4" />
          <p className="font-display font-bold text-[18px] mb-2">No vehicles yet</p>
          <p className="text-[14px] text-ink-3 mb-6">Add your first vehicle to get started.</p>
          <Link href="/admin/vehicles/new" className="bg-accent text-white font-semibold text-[14px] px-6 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors inline-block">
            + Add Vehicle
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13.5px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>{['Vehicle','Hire Mode','Price','Status',''].map(h => <th key={h} className="text-left px-6 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {vehicles.map(v => {
                const img = getVehicleImage(v)
                return (
                  <tr key={v.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-9 bg-slate rounded-[4px] overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                          {img ? <img src={img} alt={v.name} className="absolute inset-0 w-full h-full object-cover" /> : <PortalIcon name="car-front" size={19} className="text-white/35" />}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{v.name}</p>
                          {v.category && <p className="text-[12px] text-ink-4">{v.category.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${v.meta.hire_modes === 'chauffeured_only' ? 'bg-accent-bg text-accent-dark border-[#f0c4a0]' : 'bg-success-bg text-success border-success/30'}`}>
                        {v.meta.hire_modes === 'chauffeured_only' ? 'Chauffeur Only' : 'Chauffeur / Self-Drive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-display font-bold">{formatCurrency(v.price)}</span>
                      <span className="text-ink-4">/day</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${v.is_available ? 'bg-success-bg text-success border-success/30' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {v.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/vehicles/${v.id}`} className="text-accent hover:underline font-medium text-[13px]">Edit →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
