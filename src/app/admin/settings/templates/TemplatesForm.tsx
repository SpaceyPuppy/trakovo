'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { TEMPLATE_META, PLACEHOLDERS, CONDITIONALS, type TemplateType } from '@/lib/email-template-defaults'

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

export default function TemplatesForm({ initial }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('booking_notification')
  const [templateHtml, setTemplateHtml] = useState(() => initial[TEMPLATE_META.booking_notification.key] || TEMPLATE_META.booking_notification.default)
  const [previewHtml, setPreviewHtml] = useState('')
  const [templateDirty, setTemplateDirty] = useState(false)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function flash(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setError(null) }
    else { setError(msg); setSuccess(null) }
    setTimeout(() => { setSuccess(null); setError(null) }, 4000)
  }

  const fetchPreview = useCallback(async (html: string, type: TemplateType) => {
    try {
      const res = await fetch('/api/admin/settings/email-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: html, templateType: type }),
      })
      const d = await res.json()
      if (res.ok) setPreviewHtml(d.html)
    } catch { /* preview errors are silent */ }
  }, [])

  useEffect(() => {
    fetchPreview(templateHtml, selectedTemplate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTemplateChange(html: string) {
    setTemplateHtml(html)
    setTemplateDirty(true)
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => fetchPreview(html, selectedTemplate), 600)
  }

  function handleTemplateSwitch(type: TemplateType) {
    setSelectedTemplate(type)
    const meta = TEMPLATE_META[type]
    const html = initial[meta.key] || meta.default
    setTemplateHtml(html)
    setTemplateDirty(false)
    if (previewTimer.current) clearTimeout(previewTimer.current)
    fetchPreview(html, type)
  }

  async function handleTemplateSave() {
    setSaving(true)
    try {
      const meta = TEMPLATE_META[selectedTemplate]
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [meta.key]: templateHtml }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save failed') }
      flash('Template saved', 'success')
      setTemplateDirty(false)
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error')
    } finally { setSaving(false) }
  }

  async function handleTemplateReset() {
    if (!confirm('Reset this template to the default? Your customisations will be lost.')) return
    setSaving(true)
    try {
      const meta = TEMPLATE_META[selectedTemplate]
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [meta.key]: '' }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Reset failed') }
      setTemplateHtml(meta.default)
      setTemplateDirty(false)
      fetchPreview(meta.default, selectedTemplate)
      flash('Template reset to default', 'success')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Reset failed', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      {success && (
        <p className="text-[13px] text-success bg-success-bg border border-success/30 rounded-[6px] px-3 py-2">{success}</p>
      )}
      {error && (
        <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">{error}</p>
      )}

      <Card
        title="Email Templates"
        description="Customise the HTML for each email type. Use {{placeholder}} variables and {{#if condition}}…{{/if condition}} blocks.">
        {/* Template selector */}
        <Field label="Template">
          <select
            className={inp}
            value={selectedTemplate}
            onChange={(e) => handleTemplateSwitch(e.target.value as TemplateType)}>
            {(Object.keys(TEMPLATE_META) as TemplateType[]).map((key) => (
              <option key={key} value={key}>{TEMPLATE_META[key].label}</option>
            ))}
          </select>
        </Field>
        <p className="text-[12px] text-ink-4 -mt-1">{TEMPLATE_META[selectedTemplate].description}</p>

        {/* Editor + preview */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">HTML Editor</label>
            <textarea
              className="w-full border border-border rounded-[6px] px-3 py-2.5 text-[12px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all font-mono resize-none leading-relaxed"
              style={{ height: 480 }}
              value={templateHtml}
              onChange={(e) => handleTemplateChange(e.target.value)}
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
              style={{ height: 480 }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Variable reference */}
        <details className="group">
          <summary className="cursor-pointer text-[12px] font-semibold text-ink-3 hover:text-ink transition-colors select-none list-none flex items-center gap-1.5">
            <span className="text-[10px] group-open:rotate-90 transition-transform inline-block">▶</span>
            Available variables &amp; conditionals
          </summary>
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-2">Variables</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {PLACEHOLDERS.map((p) => (
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
                {CONDITIONALS.map((c) => (
                  <div key={c.name} className="text-[12px]">
                    <code className="font-mono text-[11px] text-accent">{`{{#if ${c.name}}}…{{/if ${c.name}}}`}</code>
                    <span className="text-ink-3 ml-2">{c.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleTemplateSave}
            disabled={saving}
            className="bg-accent text-white font-display font-bold text-[13.5px] px-5 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : templateDirty ? 'Save Template *' : 'Save Template'}
          </button>
          <button
            onClick={handleTemplateReset}
            disabled={saving}
            className="border border-border text-ink-3 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all disabled:opacity-50">
            Reset to Default
          </button>
        </div>
      </Card>
    </div>
  )
}
