import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getVendorSession } from '@/lib/vendor-auth'
import { query, queryOne } from '@/lib/db'
import type { Metadata } from 'next'
import PortalIcon from '@/components/ui/PortalIcon'

export const revalidate = 0

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = await queryOne<{ name: string }>('SELECT name FROM Vehicle WHERE id = ? LIMIT 1', [params.id]).catch(() => null)
  return { title: v?.name ?? 'Vehicle' }
}

export default async function VendorVehicleDetailPage({ params }: Props) {
  const session = await getVendorSession()
  if (!session) redirect('/vendor/login')

  // Verify this vendor has access to this vehicle
  const access = await queryOne<{ id: number }>(
    'SELECT id FROM VendorVehicle WHERE vendor_id = ? AND vehicle_id = ? AND is_enabled = 1 LIMIT 1',
    [session.vendorId, params.id]
  )
  if (!access) notFound()

  const vehicle = await queryOne<{
    id: string; name: string; slug: string; hire_modes: string;
    chauffeur_price: number; price: number; passengers: string;
    transmission: string; fuel: string; description: string; is_available: number;
  }>('SELECT * FROM Vehicle WHERE id = ? LIMIT 1', [params.id])
  if (!vehicle) notFound()

  const bookings = await query<{
    id: string; public_id: string; status: string; hire_type: string;
    start_date: string; end_date: string; total_days: number;
    total_cost: number; contact_name: string | null; contact_email: string;
    contact_phone: string; is_enquiry: number; created_at: Date;
  }>(
    `SELECT id, public_id, status, hire_type, start_date, end_date, total_days,
            total_cost, contact_name, contact_email, contact_phone, is_enquiry, created_at
     FROM Booking
     WHERE vehicle_id = ?
     ORDER BY created_at DESC`,
    [params.id]
  )

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-blue-50 text-blue-700',
    completed: 'bg-success-bg text-success',
    cancelled: 'bg-red-50 text-red-600',
  }

  return (
    <div>
      <Link href="/vendor/vehicles" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-3 font-medium hover:text-ink transition-colors mb-6">
        ← Back to Vehicles
      </Link>

      {/* Vehicle summary */}
      <div className="bg-white border border-border rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display font-bold text-[24px] tracking-tight">{vehicle.name}</h1>
            {vehicle.description && <p className="text-[14px] text-ink-3 mt-1 max-w-[600px]">{vehicle.description}</p>}
          </div>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${vehicle.is_available ? 'bg-success-bg text-success' : 'bg-red-50 text-red-600'}`}>
            {vehicle.is_available ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-[13px] text-ink-3">
          {vehicle.passengers && <span className="inline-flex items-center gap-1.5"><PortalIcon name="users" size={14} /> {vehicle.passengers} passengers</span>}
          {vehicle.transmission && <span className="inline-flex items-center gap-1.5"><PortalIcon name="settings-2" size={14} /> {vehicle.transmission}</span>}
          {vehicle.fuel && <span className="inline-flex items-center gap-1.5"><PortalIcon name="car-front" size={14} /> {vehicle.fuel}</span>}
        </div>
      </div>

      {/* Bookings */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-[18px]">Bookings</h2>
        <p className="text-[13px] text-ink-4">{bookings.length} total</p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-10 text-center">
          <p className="text-[14px] text-ink-3">No bookings yet for this vehicle.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-border bg-bg">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-ink-3 uppercase tracking-wider">ID</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Dates</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-bg transition-colors">
                  <td className="px-5 py-3 font-mono text-[12px] text-ink-3">{b.public_id}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium">{b.contact_name ?? b.contact_email}</p>
                    <p className="text-[12px] text-ink-4">{b.contact_phone}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p>{b.start_date} → {b.end_date}</p>
                    <p className="text-[12px] text-ink-4">{b.total_days} day{b.total_days !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-5 py-3 capitalize">{b.is_enquiry ? 'Enquiry' : b.hire_type}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor[b.status] ?? 'bg-bg text-ink-3'}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
