'use client'
import { useState, useRef } from 'react'

interface Props {
  initial: Record<string, string>
}

const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all'

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-bg">
        <h3 className="font-display font-bold text-[14px]">{title}</h3>
        {description && <p className="text-[12.5px] text-ink-3 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

export default function GeneralForm({ initial }: Props) {
  const [siteUrl, setSiteUrl] = useState(initial.site_url ?? '')
  const [siteName, setSiteName] = useState(initial.site_name ?? '')
  const [adminName, setAdminName] = useState(initial.admin_name ?? '')
  const [driverName, setDriverName] = useState(initial.driver_name ?? '')
  const [notifEmail, setNotifEmail] = useState(initial.notification_email ?? '')
  const [businessName, setBusinessName] = useState(initial.business_name ?? '')
  const [contactPhone, setContactPhone] = useState(initial.contact_phone ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logo_path ? '/api/logo' : null)
  const [heroUrl, setHeroUrl] = useState<string | null>(initial.hero_image_path ? '/api/hero' : null)
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)

  function flash(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setError(null) }
    else { setError(msg); setSuccess(null) }
    setTimeout(() => { setSuccess(null); setError(null) }, 4000)
  }

  async function saveSettings(patch: Record<string, string>, section: string) {
    setSaving(section)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save failed') }
      flash('Settings saved', 'success')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Something went wrong', 'error')
    } finally { setSaving(null) }
  }

  async function handleLogoUpload(file: File) {
    setSaving('logo')
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch('/api/admin/settings/logo', { method: 'POST', body: fd })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Upload failed') }
      setLogoUrl(`/api/logo?t=${Date.now()}`)
      flash('Logo uploaded', 'success')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Upload failed', 'error')
    } finally { setSaving(null) }
  }

  async function handleLogoRemove() {
    if (!confirm('Remove the current logo?')) return
    setSaving('logo')
    try {
      await fetch('/api/admin/settings/logo', { method: 'DELETE' })
      setLogoUrl(null)
      flash('Logo removed', 'success')
    } catch {
      flash('Remove failed', 'error')
    } finally { setSaving(null) }
  }

  async function handleHeroUpload(file: File) {
    setSaving('hero')
    try {
      const fd = new FormData()
      fd.append('hero', file)
      const res = await fetch('/api/admin/settings/hero', { method: 'POST', body: fd })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Upload failed') }
      setHeroUrl(`/api/hero?t=${Date.now()}`)
      flash('Hero image uploaded', 'success')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Upload failed', 'error')
    } finally { setSaving(null) }
  }

  async function handleHeroRemove() {
    if (!confirm('Remove the hero image?')) return
    setSaving('hero')
    try {
      await fetch('/api/admin/settings/hero', { method: 'DELETE' })
      setHeroUrl(null)
      flash('Hero image removed', 'success')
    } catch {
      flash('Remove failed', 'error')
    } finally { setSaving(null) }
  }

  return (
    <div className="space-y-6">
      {success && (
        <p className="text-[13px] text-success bg-success-bg border border-success/30 rounded-[6px] px-3 py-2">{success}</p>
      )}
      {error && (
        <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">{error}</p>
      )}

      <Card title="Site Branding" description="Controls the name shown on the public site, admin portal, and driver portal.">
        <Field label="Public Site Name">
          <input
            className={inp}
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="Trakovo"
          />
        </Field>
        <Field label="Admin / Partner Portal Name">
          <input
            className={inp}
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="Hire Manager"
          />
        </Field>
        <Field label="Driver Portal Name">
          <input
            className={inp}
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            placeholder="DriveMaster"
          />
        </Field>
        <p className="text-[12px] text-ink-4">Leave blank to use the defaults.</p>
        <button
          onClick={() => saveSettings({ site_name: siteName, admin_name: adminName, driver_name: driverName }, 'brand')}
          disabled={saving === 'brand'}
          className="bg-accent text-white font-display font-bold text-[13.5px] px-5 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
          {saving === 'brand' ? 'Saving…' : 'Save'}
        </button>
      </Card>

      <Card title="Notification Email" description="All new booking requests will be emailed to this address.">
        <Field label="Email Address">
          <input
            className={inp}
            type="email"
            value={notifEmail}
            onChange={(e) => setNotifEmail(e.target.value)}
            placeholder="staff@yourbusiness.com"
          />
        </Field>
        <p className="text-[12px] text-ink-4">Leave blank to disable email notifications.</p>
        <button
          onClick={() => saveSettings({ notification_email: notifEmail }, 'notif')}
          disabled={saving === 'notif'}
          className="bg-accent text-white font-display font-bold text-[13.5px] px-5 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
          {saving === 'notif' ? 'Saving…' : 'Save'}
        </button>
      </Card>

      <Card title="Business Details" description="Used in notification emails and other communications.">
        <Field label="Site URL">
          <input
            className={inp}
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://yourdomain.com"
          />
          <p className="text-[12px] text-ink-4">Used for OAuth redirects, email links, and QR codes. No trailing slash.</p>
        </Field>
        <Field label="Business Name">
          <input
            className={inp}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Trakovo Transport Services"
          />
        </Field>
        <Field label="Contact Phone">
          <input
            className={inp}
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+61 4XX XXX XXX"
          />
        </Field>
        <button
          onClick={() => saveSettings({ site_url: siteUrl.replace(/\/$/, ''), business_name: businessName, contact_phone: contactPhone }, 'biz')}
          disabled={saving === 'biz'}
          className="bg-accent text-white font-display font-bold text-[13.5px] px-5 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
          {saving === 'biz' ? 'Saving…' : 'Save'}
        </button>
      </Card>

      <Card title="Branding" description="Upload a logo to display in the site header. Accepts PNG, JPG, WebP, or SVG.">
        {logoUrl ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Current logo" className="h-12 w-auto object-contain border border-border rounded-[6px] p-2 bg-white" />
            <div className="flex gap-2">
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={saving === 'logo'}
                className="border border-border text-ink-3 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all disabled:opacity-50">
                Replace
              </button>
              <button
                onClick={handleLogoRemove}
                disabled={saving === 'logo'}
                className="border border-red-200 text-red-600 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:bg-red-50 transition-all disabled:opacity-50">
                {saving === 'logo' ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-border rounded-[8px] p-8 text-center cursor-pointer hover:border-ink-3 transition-colors"
            onClick={() => logoInputRef.current?.click()}>
            <p className="text-[24px] mb-2">🖼</p>
            <p className="text-[13.5px] font-medium text-ink-3">Click to upload logo</p>
            <p className="text-[12px] text-ink-4 mt-1">PNG, JPG, WebP, or SVG · Max 10MB</p>
          </div>
        )}
        <input
          ref={logoInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleLogoUpload(file)
            e.target.value = ''
          }}
        />
        {saving === 'logo' && <p className="text-[12.5px] text-ink-3">Uploading…</p>}
      </Card>

      <Card title="Hero Image" description="Full-width image shown on the homepage. When set, replaces the dark gradient hero with your photo. Accepts PNG, JPG, or WebP.">
        {heroUrl ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroUrl} alt="Current hero" className="w-full max-h-[200px] object-cover rounded-[8px] border border-border" />
            <div className="flex gap-2">
              <button
                onClick={() => heroInputRef.current?.click()}
                disabled={saving === 'hero'}
                className="border border-border text-ink-3 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all disabled:opacity-50">
                Replace
              </button>
              <button
                onClick={handleHeroRemove}
                disabled={saving === 'hero'}
                className="border border-red-200 text-red-600 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:bg-red-50 transition-all disabled:opacity-50">
                {saving === 'hero' ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-border rounded-[8px] p-8 text-center cursor-pointer hover:border-ink-3 transition-colors"
            onClick={() => heroInputRef.current?.click()}>
            <p className="text-[24px] mb-2">🌄</p>
            <p className="text-[13.5px] font-medium text-ink-3">Click to upload hero image</p>
            <p className="text-[12px] text-ink-4 mt-1">PNG, JPG, or WebP · Wide landscape recommended</p>
          </div>
        )}
        <input
          ref={heroInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleHeroUpload(file)
            e.target.value = ''
          }}
        />
        {saving === 'hero' && <p className="text-[12.5px] text-ink-3">Uploading…</p>}
      </Card>
    </div>
  )
}
