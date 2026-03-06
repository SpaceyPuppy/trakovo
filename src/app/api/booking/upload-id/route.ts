import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { saveUpload } from '@/lib/uploads'

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()
    const ref = (fd.get('ref') as string | null)?.trim()
    const idFile = fd.get('id_document') as File | null

    if (!ref) return NextResponse.json({ error: 'Missing booking reference' }, { status: 400 })
    if (!idFile || idFile.size === 0) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const booking = await queryOne('SELECT id FROM Booking WHERE public_id = ? LIMIT 1', [ref])
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const id_document_path = await saveUpload(idFile, `bookings/${ref}`, 'id_document')

    await execute('UPDATE Booking SET id_document_path = ? WHERE public_id = ?', [id_document_path, ref])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[upload-id]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
