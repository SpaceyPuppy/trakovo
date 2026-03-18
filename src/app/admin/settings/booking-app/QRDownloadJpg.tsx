'use client'

export default function QRDownloadJpg() {
  async function handleDownload() {
    const res = await fetch('/api/admin/qr')
    const svgText = await res.text()

    const blob = new Blob([svgText], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    img.onload = () => {
      const size = 600
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)

      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/jpeg', 0.95)
      a.download = 'booking-qr.jpg'
      a.click()
    }
    img.src = url
  }

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 border border-border text-ink-3 font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all">
      ↓ Download QR Code (JPG)
    </button>
  )
}
