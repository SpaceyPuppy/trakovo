'use client'
import { useState } from 'react'

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function ConfirmationUploadCard({ bookingRef }: { bookingRef: string }) {
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setState('uploading')
    setErrorMsg('')
    try {
      const fd = new FormData()
      fd.append('ref', bookingRef)
      fd.append('id_document', file)
      const res = await fetch('/api/booking/upload-id', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setState('success')
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    }
  }

  if (state === 'success') {
    return (
      <div className="bg-success-bg border border-success/30 rounded-xl px-7 py-6 text-center mb-5">
        <p className="text-[22px] mb-2">✓</p>
        <p className="font-display font-bold text-[15px] text-success mb-1">ID uploaded successfully</p>
        <p className="text-[13px] text-ink-3">Our team will verify it ahead of your collection — see you on the day!</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-xl px-7 py-6 text-left mb-5 shadow-card">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-[22px] mt-0.5">📎</span>
        <div>
          <p className="font-display font-bold text-[15px] mb-1">Speed up vehicle collection <span className="text-ink-4 font-normal text-[13px]">(optional)</span></p>
          <p className="text-[13px] text-ink-3">Upload your photo ID now and our team can verify it before collection — saving time on the day.</p>
        </div>
      </div>

      {errorMsg && (
        <p className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2 mb-3">{errorMsg}</p>
      )}

      <label className={`border-[1.5px] border-dashed rounded-[6px] px-4 py-4 text-center cursor-pointer block transition-all ${state === 'uploading' ? 'opacity-50 pointer-events-none border-border-2 bg-bg' : 'border-border-2 hover:border-ink hover:text-ink bg-bg text-ink-3'}`}>
        {state === 'uploading' ? (
          <span className="text-[13px]">Uploading…</span>
        ) : (
          <>
            <p className="text-[13px] font-medium mb-0.5">📎 Click to upload passport or driver licence</p>
            <p className="text-[11.5px] text-ink-4">Accepts JPG, PNG or PDF</p>
          </>
        )}
        <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFile} disabled={state === 'uploading'} />
      </label>

      <p className="text-[12px] text-ink-4 text-center mt-3">
        You can also simply <strong>present your ID in person</strong> when you collect the vehicle.
      </p>
    </div>
  )
}
