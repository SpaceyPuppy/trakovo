'use client'
import { useState, useEffect, useCallback } from 'react'

interface VendorRow { id: string; name: string; has_access: boolean }

export default function VendorAccessManager({ vehicleId }: { vehicleId: string }) {
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/vendor-access`)
      if (res.ok) setVendors(await res.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [vehicleId])

  useEffect(() => { load() }, [load])

  async function toggle(vendor: VendorRow) {
    setToggling(vendor.id); setError(null)
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/vendor-access`, {
        method: vendor.has_access ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendor.id }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      setVendors(vs => vs.map(v => v.id === vendor.id ? { ...v, has_access: !v.has_access } : v))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setToggling(null) }
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-bg">
        <h3 className="font-display font-bold text-[14px]">Vendor Access</h3>
        <p className="text-[12.5px] text-ink-3 mt-0.5">
          Vendors with access can see this vehicle and its bookings in their portal.
        </p>
      </div>
      <div className="px-6 py-5">
        {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2 mb-4">{error}</p>}
        {loading ? (
          <p className="text-[13.5px] text-ink-3">Loading vendors…</p>
        ) : vendors.length === 0 ? (
          <p className="text-[13.5px] text-ink-3">No vendors found. Create a vendor first.</p>
        ) : (
          <div className="space-y-2">
            {vendors.map(v => (
              <div key={v.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-[14px] font-medium">{v.name}</p>
                  <p className="text-[12px] text-ink-4">{v.has_access ? 'Has access' : 'No access'}</p>
                </div>
                <button
                  onClick={() => toggle(v)}
                  disabled={toggling === v.id}
                  className={`text-[12.5px] font-semibold px-4 py-1.5 rounded-[6px] border transition-all disabled:opacity-50 ${
                    v.has_access
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-accent/40 text-accent hover:bg-accent-bg'
                  }`}>
                  {toggling === v.id ? '…' : v.has_access ? 'Revoke' : 'Grant Access'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
