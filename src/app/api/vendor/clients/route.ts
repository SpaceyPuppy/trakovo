import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { queryOne, execute, newId, generatePublicId } from '@/lib/db'
import { listActiveVendorClientSummaries } from '@/lib/repositories/vendor-clients'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const clients = await listActiveVendorClientSummaries(session.vendorId)
  return NextResponse.json({ clients })
}

export async function POST(req: Request) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, email, phone, reference, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const public_id = await generatePublicId('VNC')
  const id = newId()

  await execute(
    'INSERT INTO VendorClient (id, public_id, vendor_id, name, email, phone, reference, notes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
    [id, public_id, session.vendorId, name, email ?? '', phone ?? '', reference ?? '', notes ?? '']
  )

  const client = await queryOne('SELECT * FROM VendorClient WHERE id = ? LIMIT 1', [id])
  return NextResponse.json({ client: { ...client, is_active: Boolean((client as { is_active: number }).is_active) } }, { status: 201 })
}
