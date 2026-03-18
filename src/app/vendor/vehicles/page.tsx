import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getVendorSession } from '@/lib/vendor-auth'
import { query } from '@/lib/db'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Vehicles' }
export const revalidate = 0

export default async function VendorVehiclesPage() {
  const session = await getVendorSession()
  if (!session) redirect('/vendor/login')

  const vehicles = await query<{
    id: string; name: string; slug: string; hire_modes: string;
    chauffeur_price: number; price: number; passengers: string;
    is_available: number; booking_count: number;
  }>(
    `SELECT v.id, v.name, v.slug, v.hire_modes, v.chauffeur_price, v.price,
            v.passengers, v.is_available,
            COUNT(b.id) as booking_count
     FROM Vehicle v
     INNER JOIN VendorVehicle vv ON vv.vehicle_id = v.id
     LEFT JOIN Booking b ON b.vehicle_id = v.id AND b.status IN ('pending','confirmed')
     WHERE vv.vendor_id = ? AND vv.is_enabled = 1
     GROUP BY v.id
     ORDER BY v.name ASC`,
    [session.vendorId]
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">My Vehicles</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Vehicles assigned to your portal.</p>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-12 text-center">
          <p className="text-[15px] text-ink-3">No vehicles assigned to your account yet.</p>
          <p className="text-[13px] text-ink-4 mt-1">Contact your administrator to request access.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map(v => (
            <Link key={v.id} href={`/vendor/vehicles/${v.id}`}
              className="bg-white border border-border rounded-xl p-5 hover:border-ink-3 hover:shadow-sm transition-all block">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display font-bold text-[15px] leading-snug">{v.name}</h3>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${v.is_available ? 'bg-success-bg text-success' : 'bg-red-50 text-red-600'}`}>
                  {v.is_available ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-[12.5px] text-ink-3">
                {v.passengers && <p>👥 {v.passengers} passengers</p>}
                <p>📋 {v.booking_count} active booking{v.booking_count !== 1 ? 's' : ''}</p>
              </div>
              <p className="mt-3 text-[12px] text-accent font-medium">View bookings →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
