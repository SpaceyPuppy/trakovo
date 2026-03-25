'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { TEMPLATE_META, PLACEHOLDERS, CONDITIONALS, type TemplateType } from '@/lib/email-template-defaults'
import { SMS_TEMPLATE_META } from '@/lib/sms-template-defaults'
import { cn } from '@/lib/utils'

interface Props {
  settings: Record<string, string>
}

// ─── Unified template list ────────────────────────────────────────────────────

type TemplateEntry = {
  id: string
  type: 'email' | 'sms'
  label: string
  description: string
  settingKey: string
  enabledKey: string
  defaultBody: string
  emailTemplateType?: TemplateType
  smsPlaceholders?: Array<{ name: string; description: string }>
}

const ALL_TEMPLATES: TemplateEntry[] = [
  ...(Object.entries(TEMPLATE_META) as [TemplateType, typeof TEMPLATE_META[TemplateType]][]).map(([typeKey, meta]) => ({
    id: typeKey,
    type: 'email' as const,
    label: meta.label,
    description: meta.description,
    settingKey: meta.key,
    enabledKey: `${meta.key}_enabled`,
    defaultBody: meta.default,
    emailTemplateType: typeKey,
  })),
  ...Object.entries(SMS_TEMPLATE_META).map(([typeKey, meta]) => ({
    id: typeKey,
    type: 'sms' as const,
    label: meta.label,
    description: meta.description,
    settingKey: meta.key,
    enabledKey: meta.enabledKey,
    defaultBody: meta.default,
    smsPlaceholders: [...meta.placeholders],
  })),
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChannelBadge({ type }: { type: 'email' | 'sms' }) {
  return type === 'email' ? (
    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
      Email
    </span>
  ) : (
    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      SMS
    </span>
  )
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      title={enabled ? 'Disable' : 'Enable'}
      className={cn('relative shrink-0 rounded-full transition-colors border', enabled ? 'bg-accent border-accent' : 'bg-bg border-border')}
      style={{ width: 36, height: 20 }}
    >
      <span
        className={cn('absolute top-0.5 rounded-full bg-white shadow transition-transform', enabled ? 'translate-x-[17px]' : 'translate-x-0.5')}
        style={{ width: 16, height: 16 }}
      />
    </button>
  )
}

// ─── Email editor (HTML + live preview) ──────────────────────────────────────

function EmailEditor({ templateType, settingKey, initialBody, defaultBody, onSaved }: {
  templateType: TemplateType
  settingKey: string
  initialBody: string
  defaultBody: string
  onSaved: (msg: string) => void
}) {
  const [html, setHtml] = useState(initialBody)
  const [previewHtml, setPreviewHtml] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPreview = useCallback(async (body: string, type: TemplateType) => {
    try {
      const res = await fetch('/api/admin/settings/email-preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: body, templateType: type }),
      })
      const d = await res.json()
      if (res.ok) setPreviewHtml(d.html)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchPreview(html, templateType) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(val: string) {
    setHtml(val); setDirty(true)
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => fetchPreview(val, templateType), 600)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingKey]: html }),
      })
      if (!res.ok) throw new Error('Save failed')
      setDirty(false)
      onSaved('Template saved')
    } catch { onSaved('') } // flash error via parent if needed
    finally { setSaving(false) }
  }

  async function handleReset() {
    if (!confirm('Reset to default? Your customisations will be lost.')) return
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingKey]: '' }),
      })
      setHtml(defaultBody); setDirty(false)
      fetchPreview(defaultBody, templateType)
      onSaved('Template reset to default')
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">HTML Editor</label>
          <textarea
            className="w-full border border-border rounded-[6px] px-3 py-2.5 text-[12px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all font-mono resize-none leading-relaxed"
            style={{ height: 440 }}
            value={html}
            onChange={e => handleChange(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider flex items-center gap-2">
            Live Preview <span className="text-ink-4 normal-case tracking-normal font-normal">(sample data)</span>
          </label>
          <iframe
            srcDoc={previewHtml || '<p style="font-family:sans-serif;color:#888;padding:20px;">Loading preview…</p>'}
            title="Email preview"
            className="w-full border border-border rounded-[6px] bg-white"
            style={{ height: 440 }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-[12px] font-semibold text-ink-3 hover:text-ink transition-colors select-none list-none flex items-center gap-1.5">
          <span className="text-[10px] group-open:rotate-90 transition-transform inline-block">▶</span>
          Available variables &amp; conditionals
        </summary>
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-2">Variables</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              {PLACEHOLDERS.map(p => (
                <div key={p.name} className="flex items-baseline gap-2 text-[12px]">
                  <code className="font-mono text-accent shrink-0">{`{{${p.name}}}`}</code>
                  <span className="text-ink-3 truncate">{p.description}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-2">Conditionals</p>
            <div className="space-y-1.5">
              {CONDITIONALS.map(c => (
                <div key={c.name} className="text-[12px]">
                  <code className="font-mono text-[11px] text-accent">{`{{#if ${c.name}}}…{{/if ${c.name}}}`}</code>
                  <span className="text-ink-3 ml-2">{c.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>

      <div className="flex items-center gap-3 pt-1 border-t border-border">
        <button onClick={handleSave} disabled={saving}
          className="bg-accent text-white font-display font-bold text-[13.5px] px-5 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : dirty ? 'Save Template *' : 'Save Template'}
        </button>
        <button onClick={handleReset} disabled={saving}
          className="border border-border text-ink-3 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all disabled:opacity-50">
          Reset to Default
        </button>
      </div>
    </div>
  )
}

// ─── SMS editor (plain text) ──────────────────────────────────────────────────

function SmsEditor({ settingKey, initialBody, defaultBody, placeholders, onSaved }: {
  settingKey: string
  initialBody: string
  defaultBody: string
  placeholders: Array<{ name: string; description: string }>
  onSaved: (msg: string) => void
}) {
  const [body, setBody] = useState(initialBody)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingKey]: body }),
      })
      if (!res.ok) throw new Error('Save failed')
      setDirty(false)
      onSaved('Template saved')
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  async function handleReset() {
    if (!confirm('Reset to default? Your customisations will be lost.')) return
    await fetch('/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [settingKey]: '' }),
    }).catch(() => {})
    setBody(defaultBody); setDirty(false)
    onSaved('Template reset to default')
  }

  const charCount = body.length
  const segments = Math.ceil(charCount / 160)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5">Message Body</label>
        <textarea
          className="w-full border border-border rounded-[6px] px-3 py-2.5 text-[13px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all resize-none leading-relaxed"
          style={{ height: 100 }}
          value={body}
          onChange={e => { setBody(e.target.value); setDirty(true) }}
          spellCheck={false}
        />
        <p className="text-[11px] text-ink-4 mt-1">{charCount} chars · {segments} segment{segments !== 1 ? 's' : ''}</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-2">Available variables</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {placeholders.map(p => (
            <div key={p.name} className="flex items-baseline gap-2 text-[12px]">
              <code className="font-mono text-accent shrink-0">{`{{${p.name}}}`}</code>
              <span className="text-ink-3 truncate">{p.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1 border-t border-border">
        <button onClick={handleSave} disabled={saving}
          className="bg-accent text-white font-display font-bold text-[13.5px] px-5 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : dirty ? 'Save Template *' : 'Save Template'}
        </button>
        <button onClick={handleReset} disabled={saving}
          className="border border-border text-ink-3 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all disabled:opacity-50">
          Reset to Default
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TemplatesForm({ settings }: Props) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {}
    for (const tpl of ALL_TEMPLATES) {
      out[tpl.enabledKey] = settings[tpl.enabledKey] !== '0'
    }
    return out
  })
  const [editing, setEditing] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  function flashSaved(msg: string) {
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(null), 3000)
  }

  function handleToggle(enabledKey: string) {
    const next = !enabled[enabledKey]
    setEnabled(prev => ({ ...prev, [enabledKey]: next }))
    fetch('/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [enabledKey]: next ? '1' : '0' }),
    }).catch(() => {
      // revert on error
      setEnabled(prev => ({ ...prev, [enabledKey]: !next }))
    })
  }

  return (
    <div className="space-y-4">
      {savedMsg && (
        <p className="text-[13px] text-success bg-success-bg border border-success/30 rounded-[6px] px-3 py-2">{savedMsg}</p>
      )}

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {ALL_TEMPLATES.map((tpl, i) => {
          const isEditing = editing === tpl.id
          const isEnabled = enabled[tpl.enabledKey]
          return (
            <div key={tpl.id} className={i > 0 ? 'border-t border-border' : ''}>
              {/* Row */}
              <div className={cn('flex items-center gap-3 px-5 py-3.5 transition-colors', isEditing && 'bg-bg/60')}>
                <ChannelBadge type={tpl.type} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[13px] font-semibold leading-tight', isEnabled ? 'text-ink' : 'text-ink-3')}>{tpl.label}</p>
                  <p className="text-[11px] text-ink-3 mt-0.5 leading-snug">{tpl.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Toggle enabled={isEnabled} onChange={() => handleToggle(tpl.enabledKey)} />
                  <button
                    onClick={() => setEditing(isEditing ? null : tpl.id)}
                    className={cn(
                      'text-[12px] font-semibold px-3 py-1.5 rounded-[6px] border transition-colors whitespace-nowrap',
                      isEditing
                        ? 'bg-ink text-white border-ink'
                        : 'border-border text-ink-3 hover:border-ink-3 hover:text-ink'
                    )}
                  >
                    {isEditing ? 'Close' : 'Edit'}
                  </button>
                </div>
              </div>

              {/* Inline editor */}
              {isEditing && (
                <div className="border-t border-border px-5 py-5 bg-bg/30">
                  {tpl.type === 'email' ? (
                    <EmailEditor
                      templateType={tpl.emailTemplateType!}
                      settingKey={tpl.settingKey}
                      initialBody={settings[tpl.settingKey] || tpl.defaultBody}
                      defaultBody={tpl.defaultBody}
                      onSaved={msg => { if (msg) flashSaved(msg) }}
                    />
                  ) : (
                    <SmsEditor
                      settingKey={tpl.settingKey}
                      initialBody={settings[tpl.settingKey] || tpl.defaultBody}
                      defaultBody={tpl.defaultBody}
                      placeholders={tpl.smsPlaceholders ?? []}
                      onSaved={msg => { if (msg) flashSaved(msg) }}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
