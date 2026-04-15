'use client'
import { useState } from 'react'

import Link from 'next/link'
import { formatCurrency, getVehicleImage } from '@/lib/utils'
import type { Vehicle } from '@/types'

const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all'

// Minimal shapes for what we need from the Prisma include
interface VendorForTabs {
  id: string
  name: string
  username: string
  contact_email: string
  contact_phone: string
  is_active: boolean
  taxi_enabled: boolean
  vehicle_hire_enabled: boolean
  vehicles: {
    vehicle_id: string
    is_enabled: boolean
    vehicle: {
      id: string
      name: string
      chauffeur_price: number
      media: { url: string }[]
    }
  }[]
  clients: { id: string; name: string; email: string; phone: string; reference: string }[]
  bookings: {
    id: string
    public_id: string
    status: string
    start_date: string
    end_date: string
    vehicle: { name: string } | null
    vendor_client: { name: string } | null
    contact_name: string | null
  }[]
}

interface Props {
  vendor: VendorForTabs
  allVehicles: Vehicle[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

export default function VendorDetailTabs({ vendor, allVehicles }: Props) {
  const [tab, setTab] = useState<'details' | 'vehicles' | 'activity'>('details')
  const [impersonating, setImpersonating] = useState(false)
  const [impersonateError, setImpersonateError] = useState<string | null>(null)

  async function loginAsVendor() {
    setImpersonating(true)
    setImpersonateError(null)
    try {
      const res = await fetch(`/api/admin/vendors/${vendor.id}/impersonate`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      window.open('/vendor', '_blank')
    } catch (e: unknown) {
      setImpersonateError(e instanceof Error ? e.message : 'Failed to log in as vendor')
    } finally {
      setImpersonating(false)
    }
  }

  // Details tab state
  const [details, setDetails] = useState({
    name: vendor.name,
    contact_email: vendor.contact_email,
    contact_phone: vendor.contact_phone,
    is_active: vendor.is_active,
    taxi_enabled: vendor.taxi_enabled,
    vehicle_hire_enabled: vendor.vehicle_hire_enabled,
  })
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailMsg, setDetailMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Username edit state
  const [username, setUsername] = useState(vendor.username)
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState(vendor.username)
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameMsg, setUsernameMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  async function saveUsername() {
    if (!newUsername.trim() || newUsername.trim() === username) { setEditingUsername(false); return }
    setUsernameSaving(true)
    try {
      const res = await fetch(`/api/admin/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setUsername(newUsername.trim())
      setEditingUsername(false)
      flash(setUsernameMsg, 'Username updated', 'success')
    } catch (e: unknown) {
      flash(setUsernameMsg, e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setUsernameSaving(false)
    }
  }

  // Password reset state
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Vehicle access state — map vehicle_id → is_enabled
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {}
    // Start all vehicles as not assigned
    for (const v of allVehicles) m[v.id] = false
    // Overlay with existing vendor assignments
    for (const vv of vendor.vehicles) m[vv.vehicle_id] = vv.is_enabled
    return m
  })
  const [vehicleSaving, setVehicleSaving] = useState(false)
  const [vehicleMsg, setVehicleMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  function flash(set: (m: { text: string; type: 'success' | 'error' } | null) => void, text: string, type: 'success' | 'error') {
    set({ text, type })
    setTimeout(() => set(null), 4000)
  }

  async function saveDetails() {
    setDetailSaving(true)
    try {
      const res = await fetch(`/api/admin/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      flash(setDetailMsg, 'Saved', 'success')
    } catch (e: unknown) {
      flash(setDetailMsg, e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setDetailSaving(false)
    }
  }

  async function resetPassword() {
    if (!newPassword || newPassword.length < 6) {
      flash(setPwMsg, 'Password must be at least 6 characters', 'error')
      return
    }
    setPwSaving(true)
    try {
      const res = await fetch(`/api/admin/vendors/${vendor.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setNewPassword('')
      flash(setPwMsg, 'Password updated', 'success')
    } catch (e: unknown) {
      flash(setPwMsg, e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setPwSaving(false)
    }
  }

  async function toggleVehicle(vehicleId: string, enabled: boolean) {
    const newMap = { ...enabledMap, [vehicleId]: enabled }
    setEnabledMap(newMap)
    setVehicleSaving(true)
    try {
      const assignments = Object.entries(newMap).map(([vehicle_id, is_enabled]) => ({ vehicle_id, is_enabled }))
      const res = await fetch(`/api/admin/vendors/${vendor.id}/vehicles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      flash(setVehicleMsg, `${enabled ? 'Enabled' : 'Disabled'} — saved`, 'success')
    } catch (e: unknown) {
      // Revert
      setEnabledMap(enabledMap)
      flash(setVehicleMsg, e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setVehicleSaving(false)
    }
  }

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'vehicles', label: 'Vehicle Access' },
    { key: 'activity', label: 'Activity' },
  ] as const

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-border mb-6">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-[13.5px] font-semibold border-b-2 transition-colors ${tab === t.key ? 'border-accent text-accent' : 'border-transparent text-ink-3 hover:text-ink'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-1">
          {impersonateError && <span className="text-[12px] text-red-600">{impersonateError}</span>}
          <button onClick={loginAsVendor} disabled={impersonating}
            className="border border-border text-ink-3 font-medium text-[13px] px-3 py-1.5 rounded-[6px] hover:border-ink-3 hover:text-ink transition-colors disabled:opacity-50 whitespace-nowrap">
            {impersonating ? 'Opening…' : 'Login as Vendor →'}
          </button>
        </div>
      </div>

      {/* Details tab */}
      {tab === 'details' && (
        <div className="space-y-6 max-w-[560px]">
          {/* Vendor info */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-bg">
              <h3 className="font-display font-bold text-[14px]">Organisation Info</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              {detailMsg && (
                <p className={`text-[13px] rounded-[6px] px-3 py-2 ${detailMsg.type === 'success' ? 'text-success bg-success-bg border border-success/30' : 'text-red-600 bg-red-50 border border-red-200'}`}>
                  {detailMsg.text}
                </p>
              )}
              <div>
                <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Organisation Name</label>
                <input className={inp} value={details.name} onChange={e => setDetails(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Username</label>
                {editingUsername ? (
                  <>
                    <div className="flex gap-2">
                      <input
                        className={inp + ' flex-1'}
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') { setNewUsername(username); setEditingUsername(false) } }}
                        autoFocus
                      />
                      <button onClick={saveUsername} disabled={usernameSaving}
                        className="bg-accent text-white font-semibold text-[13px] px-3 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50 whitespace-nowrap">
                        {usernameSaving ? '…' : 'Confirm'}
                      </button>
                      <button onClick={() => { setNewUsername(username); setEditingUsername(false) }}
                        className="border border-border text-ink-3 font-medium text-[13px] px-3 py-2 rounded-[6px] hover:text-ink transition-colors">
                        Cancel
                      </button>
                    </div>
                    {usernameMsg && (
                      <p className={`text-[12.5px] mt-1 ${usernameMsg.type === 'success' ? 'text-success' : 'text-red-600'}`}>{usernameMsg.text}</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex gap-2 items-center">
                      <input className={inp + ' flex-1 opacity-60 cursor-default'} value={username} readOnly />
                      <button onClick={() => { setNewUsername(username); setEditingUsername(true) }}
                        className="border border-border text-ink-3 font-medium text-[13px] px-3 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-colors whitespace-nowrap">
                        Edit
                      </button>
                    </div>
                    {usernameMsg && (
                      <p className={`text-[12.5px] mt-1 ${usernameMsg.type === 'success' ? 'text-success' : 'text-red-600'}`}>{usernameMsg.text}</p>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Contact Email</label>
                <input className={inp} type="email" value={details.contact_email} onChange={e => setDetails(d => ({ ...d, contact_email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Contact Phone</label>
                <input className={inp} type="tel" value={details.contact_phone} onChange={e => setDetails(d => ({ ...d, contact_phone: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between border border-border rounded-[6px] px-4 py-3">
                <div>
                  <p className="text-[13.5px] font-semibold">Active</p>
                  <p className="text-[12px] text-ink-3">Inactive vendors cannot log in to the portal.</p>
                </div>
                <button onClick={() => setDetails(d => ({ ...d, is_active: !d.is_active }))}
                  className={`w-10 h-6 rounded-full transition-colors ${details.is_active ? 'bg-accent' : 'bg-ink-4'}`}>
                  <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${details.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between border border-border rounded-[6px] px-4 py-3">
                <div>
                  <p className="text-[13.5px] font-semibold">Taxi Trips</p>
                  <p className="text-[12px] text-ink-3">Allow this vendor to create taxi trip bookings.</p>
                </div>
                <button onClick={() => setDetails(d => ({ ...d, taxi_enabled: !d.taxi_enabled }))}
                  className={`w-10 h-6 rounded-full transition-colors ${details.taxi_enabled ? 'bg-accent' : 'bg-ink-4'}`}>
                  <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${details.taxi_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between border border-border rounded-[6px] px-4 py-3">
                <div>
                  <p className="text-[13.5px] font-semibold">Vehicle Hire</p>
                  <p className="text-[12px] text-ink-3">Allow this vendor to create vehicle hire bookings.</p>
                </div>
                <button onClick={() => setDetails(d => ({ ...d, vehicle_hire_enabled: !d.vehicle_hire_enabled }))}
                  className={`w-10 h-6 rounded-full transition-colors ${details.vehicle_hire_enabled ? 'bg-accent' : 'bg-ink-4'}`}>
                  <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${details.vehicle_hire_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <button onClick={saveDetails} disabled={detailSaving}
                className="bg-accent hover:bg-accent-dark text-white font-display font-bold text-[13.5px] px-5 py-2.5 rounded-[6px] transition-colors disabled:opacity-50">
                {detailSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Password reset */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-bg">
              <h3 className="font-display font-bold text-[14px]">Reset Password</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              {pwMsg && (
                <p className={`text-[13px] rounded-[6px] px-3 py-2 ${pwMsg.type === 'success' ? 'text-success bg-success-bg border border-success/30' : 'text-red-600 bg-red-50 border border-red-200'}`}>
                  {pwMsg.text}
                </p>
              )}
              <div>
                <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">New Password</label>
                <input className={inp} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
              </div>
              <button onClick={resetPassword} disabled={pwSaving}
                className="border border-border text-ink-3 font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all disabled:opacity-40">
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Access tab */}
      {tab === 'vehicles' && (
        <div className="max-w-[680px]">
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-bg flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-[14px]">Vehicle Access</h3>
                <p className="text-[12.5px] text-ink-3 mt-0.5">Toggle which vehicles this vendor can see and book.</p>
              </div>
              {vehicleMsg && (
                <p className={`text-[12.5px] rounded-[6px] px-3 py-1.5 ${vehicleMsg.type === 'success' ? 'text-success bg-success-bg border border-success/30' : 'text-red-600 bg-red-50 border border-red-200'}`}>
                  {vehicleMsg.text}
                </p>
              )}
            </div>
            {allVehicles.length === 0 ? (
              <div className="px-6 py-10 text-center text-ink-3">No vehicles in fleet yet. <Link href="/admin/vehicles/new" className="text-accent hover:underline">Add a vehicle →</Link></div>
            ) : (
              <div className="divide-y divide-border">
                {allVehicles.map(v => {
                  const img = getVehicleImage(v)
                  const enabled = enabledMap[v.id] ?? false
                  return (
                    <div key={v.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="w-14 h-10 bg-slate rounded-[4px] overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                        {img ? <img src={img} alt={v.name} className="absolute inset-0 w-full h-full object-cover" /> : <span className="text-xl opacity-30">🚗</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13.5px]">{v.name}</p>
                        <p className="text-[12px] text-ink-3">{formatCurrency(v.chauffeur_price)}/day (chauffeur)</p>
                      </div>
                      <button
                        onClick={() => toggleVehicle(v.id, !enabled)}
                        disabled={vehicleSaving}
                        className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 ${enabled ? 'bg-accent' : 'bg-ink-4'}`}>
                        <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity tab */}
      {tab === 'activity' && (
        <div className="space-y-6 max-w-[700px]">
          {/* Recent bookings */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-bg flex items-center justify-between">
              <h3 className="font-display font-bold text-[14px]">Recent Bookings</h3>
              <Link href={`/admin/bookings`} className="text-[12.5px] text-accent hover:underline">View all →</Link>
            </div>
            {vendor.bookings.length === 0 ? (
              <p className="px-6 py-8 text-[13px] text-ink-3 text-center">No bookings yet.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
                  <tr>{['Ref', 'Vehicle', 'Client', 'Dates', 'Status'].map(h => <th key={h} className="text-left px-6 py-2.5">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {vendor.bookings.map(b => (
                    <tr key={b.id} className="border-t border-border hover:bg-bg/50">
                      <td className="px-6 py-3">
                        <Link href={`/admin/bookings/${b.id}`} className="font-mono text-[12.5px] font-bold text-accent hover:underline">{b.public_id}</Link>
                      </td>
                      <td className="px-6 py-3 text-ink-3">{b.vehicle?.name ?? '—'}</td>
                      <td className="px-6 py-3 text-ink-3">{b.vendor_client?.name ?? b.contact_name ?? '—'}</td>
                      <td className="px-6 py-3 text-ink-3 text-[12px]">{b.start_date} → {b.end_date}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Clients */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-bg">
              <h3 className="font-display font-bold text-[14px]">Clients ({vendor.clients.length})</h3>
            </div>
            {vendor.clients.length === 0 ? (
              <p className="px-6 py-8 text-[13px] text-ink-3 text-center">No clients yet.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
                  <tr>{['Name', 'Reference', 'Phone'].map(h => <th key={h} className="text-left px-6 py-2.5">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {vendor.clients.map(c => (
                    <tr key={c.id} className="border-t border-border hover:bg-bg/50">
                      <td className="px-6 py-3 font-semibold">{c.name}</td>
                      <td className="px-6 py-3 text-ink-3 font-mono text-[12px]">{c.reference || '—'}</td>
                      <td className="px-6 py-3 text-ink-3">{c.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
