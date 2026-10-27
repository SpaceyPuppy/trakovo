'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { WebsiteEnquiry } from '@/lib/website-enquiries'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ContactEnquiriesClient({ enquiries: initial, embedded = false }: { enquiries: WebsiteEnquiry[]; embedded?: boolean }) {
  const [enquiries, setEnquiries] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'new' | 'read'>('all')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')

  const filtered = filter === 'all' ? enquiries : enquiries.filter(e => e.status === filter)
  const newCount = enquiries.filter(e => e.status === 'new').length

  async function markRead(enquiry: WebsiteEnquiry) {
    setSaving(`${enquiry.source}:${enquiry.id}`); setError('')
    try {
      const response = await fetch(`/api/admin/enquiries/contact/${encodeURIComponent(enquiry.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'read', source: enquiry.source }),
      })
      if (!response.ok) throw new Error()
      setEnquiries(prev => prev.map(e => e.id === enquiry.id && e.source === enquiry.source ? { ...e, status: 'read' } : e))
    } catch { setError('Unable to mark the enquiry as read. Please try again.') }
    finally { setSaving('') }
  }

  return (
    <div className={embedded ? '' : 'px-4 py-6 sm:px-10 sm:py-10'}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          {!embedded && <Link href="/admin/enquiries" className="text-[13px] text-ink-3 hover:text-ink">← All Enquiries</Link>}
          {embedded ? <h2 className="font-display font-bold text-[20px]">Website enquiries ({enquiries.length})</h2> : <h1 className="font-display font-bold text-[26px] tracking-tight">Website Enquiries</h1>}
          <p className="text-[14px] text-ink-3 mt-0.5">Contact, Special Occasions and corporate enquiries.</p>
        </div>
        {newCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            {newCount} new
          </span>
        )}
      </div>

      {/* Filter tabs */}
      {error && <p role="alert" className="text-red-700 mb-3 text-[13px]">{error}</p>}
      <div className="flex flex-wrap gap-1 mb-5 bg-bg border border-border rounded-lg p-1 w-fit">
        {(['all', 'new', 'read'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-[5px] text-[13px] font-semibold capitalize transition-colors ${filter === f ? 'bg-white shadow-sm text-ink' : 'text-ink-3 hover:text-ink'}`}>
            {f === 'all' ? `All (${enquiries.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${enquiries.filter(e => e.status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-3">
          <p className="text-[15px]">No enquiries yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(e => (
            <div key={`${e.source}:${e.id}`} className={`bg-white border rounded-xl p-5 ${e.status === 'new' ? 'border-purple-200' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-display font-bold text-[15px]">{e.name}</span>
                    <span className="text-[11px] text-ink-3">{e.source === 'corporate' || e.message.startsWith('Corporate Enquiry') ? 'Corporate' : e.message.startsWith('Special Occasions') ? 'Special Occasions' : 'Contact'}</span>
                    {e.status === 'new' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">NEW</span>
                    )}
                    <span className="text-[12.5px] text-ink-3">{formatDate(e.created_at)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-ink-3 mb-3 break-all">
                    <a href={`mailto:${e.email}`} className="hover:text-ink transition-colors">{e.email}</a>
                    {e.phone && <span>{e.phone}</span>}
                  </div>
                  <p className="text-[13.5px] text-ink leading-[1.6] whitespace-pre-wrap break-words">{e.message}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-ink-4">{e.public_id}</span>
                  {e.status === 'new' && (
                    <button onClick={() => markRead(e)} disabled={Boolean(saving)}
                      className="border border-border text-ink-3 font-medium text-[12px] px-3 py-1.5 rounded-[6px] hover:border-ink-3 hover:text-ink transition-colors whitespace-nowrap disabled:opacity-50">
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
