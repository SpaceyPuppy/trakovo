'use client'
import { useState } from 'react'

interface Feature {
  id: string
  feature_key: string
  is_enabled: boolean
  config: unknown
}

interface Props {
  initialFeatures: Record<string, Feature[]>
}

const FEATURE_META: Record<string, { label: string; description: string }> = {
  rating:         { label: 'Post-trip rating',    description: 'Passengers rate their driver after a completed trip.' },
  rating_comment: { label: 'Rating comment',      description: 'Text feedback with the star rating. Requires rating.' },
  share_trip:     { label: 'Share trip',          description: 'Passengers can share live trip status with contacts.' },
  live_tracking:  { label: 'Live tracking',       description: 'Real-time driver location tracking for passengers.' },
}

const SERVICE_META: Record<string, { label: string; comingSoon?: boolean }> = {
  taxi:        { label: 'Taxi' },
  rideshare:   { label: 'Rideshare', comingSoon: true },
  self_drive:  { label: 'Self-Drive Hire' },
  chauffeured: { label: 'Chauffeured Hire' },
}

const SERVICE_ORDER = ['taxi', 'rideshare', 'self_drive', 'chauffeured']

function Toggle({ enabled, onClick, disabled }: { enabled: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 ${
        enabled ? 'bg-accent' : 'bg-border'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-pressed={enabled}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export default function DispatchForm({ initialFeatures }: Props) {
  const [features, setFeatures] = useState(initialFeatures)
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null)

  function flash(id: string, type: 'success' | 'error', text: string) {
    setMsg({ id, type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  async function toggle(serviceType: string, featureId: string, currentEnabled: boolean) {
    const newEnabled = !currentEnabled
    setSaving(featureId)

    // Optimistic update
    setFeatures(prev => {
      const updated = { ...prev }
      updated[serviceType] = updated[serviceType].map(f =>
        f.id === featureId ? { ...f, is_enabled: newEnabled } : f
      )
      return updated
    })

    try {
      const res = await fetch(`/api/admin/service-features/${featureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: newEnabled }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      flash(featureId, 'success', newEnabled ? 'Enabled' : 'Disabled')
    } catch (e) {
      // Revert
      setFeatures(prev => {
        const updated = { ...prev }
        updated[serviceType] = updated[serviceType].map(f =>
          f.id === featureId ? { ...f, is_enabled: currentEnabled } : f
        )
        return updated
      })
      flash(featureId, 'error', e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-[17px] text-ink">Dispatch Settings</h2>
        <p className="text-[13px] text-ink-3 mt-0.5">Configure service-level features for each transport type.</p>
      </div>

      {SERVICE_ORDER.map(serviceType => {
        const serviceMeta = SERVICE_META[serviceType]
        if (!serviceMeta) return null
        const serviceFeatures = features[serviceType] ?? []
        if (serviceFeatures.length === 0) return null

        // Check if rating is enabled (for rating_comment dependency)
        const ratingEnabled = serviceFeatures.find(f => f.feature_key === 'rating')?.is_enabled ?? false

        return (
          <div key={serviceType} className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-bg flex items-center gap-2">
              <h3 className="font-display font-bold text-[14px]">{serviceMeta.label}</h3>
              {serviceMeta.comingSoon && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  coming soon
                </span>
              )}
            </div>

            <div className="divide-y divide-border">
              {serviceFeatures.map(feature => {
                const meta = FEATURE_META[feature.feature_key]
                if (!meta) return null

                const isDependent = feature.feature_key === 'rating_comment'
                const isDisabled = saving === feature.id || (isDependent && !ratingEnabled)

                return (
                  <div key={feature.id} className={`px-6 py-4 flex items-start gap-4 ${isDisabled && isDependent ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium text-ink">{meta.label}</p>
                      <p className="text-[12.5px] text-ink-3 mt-0.5">{meta.description}</p>
                      {isDependent && !ratingEnabled && (
                        <p className="text-[11px] text-ink-3 mt-1 italic">Requires rating to be enabled.</p>
                      )}
                      {msg?.id === feature.id && (
                        <p className={`text-[11.5px] mt-1 font-medium ${msg.type === 'success' ? 'text-success' : 'text-red-500'}`}>
                          {msg.text}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <Toggle
                        enabled={feature.is_enabled}
                        onClick={() => toggle(serviceType, feature.id, feature.is_enabled)}
                        disabled={isDisabled}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {Object.keys(features).length === 0 && (
        <div className="bg-white border border-border rounded-xl px-6 py-10 text-center text-[13px] text-ink-3">
          No service features configured. Run the database migration to seed initial features.
        </div>
      )}
    </div>
  )
}
