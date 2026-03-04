'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BookingDeleteButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      router.push('/admin/bookings')
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-red-600 font-medium">Delete this booking?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-[12px] font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-[5px] transition-colors disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[12px] font-medium text-ink-3 hover:text-ink px-2 py-1.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-[12px] font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-[5px] transition-colors"
    >
      Delete
    </button>
  )
}
