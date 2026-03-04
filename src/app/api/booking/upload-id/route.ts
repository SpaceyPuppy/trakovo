import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { saveUpload } from '@/lib/uploads'

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()
    const ref = (fd.get('ref') as string | null)?.trim()
    const idFile = fd.get('id_document') as File | null

    if (!ref) return NextResponse.json({ error: 'Missing booking reference' }, { status: 400 })
    if (!idFile || idFile.size === 0) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const booking = await prisma.booking.findUnique({ where: { public_id: ref } })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const id_document_path = await saveUpload(idFile, `bookings/${ref}`, 'id_document')

    await prisma.booking.update({
      where: { public_id: ref },
      data: { id_document_path },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[upload-id]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
