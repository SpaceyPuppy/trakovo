import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, queryOne, execute, newId, generatePublicId } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const vehicles = await query('SELECT * FROM Vehicle ORDER BY created_at DESC')
  const ids = vehicles.map((v) => (v as { id: string }).id)
  let media: unknown[] = []
  if (ids.length > 0) {
    media = await query('SELECT * FROM VehicleMedia WHERE vehicle_id IN (?) ORDER BY sort_order ASC', [ids])
  }
  const result = vehicles.map((v) => ({
    ...v,
    is_available: Boolean((v as { is_available: number }).is_available),
    media: (media as { vehicle_id: string }[]).filter((m) => m.vehicle_id === (v as { id: string }).id),
  }))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const body = await req.json()
    const { name, description, price, is_available, images, meta } = body

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    let slug = slugify(name as string)
    const existing = await queryOne('SELECT id FROM Vehicle WHERE slug = ? LIMIT 1', [slug])
    if (existing) slug = `${slug}-${Date.now()}`

    const public_id = await generatePublicId('VHC')
    const id = newId()

    await execute(
      `INSERT INTO Vehicle (id, public_id, slug, name, description, price, chauffeur_price, currency, hire_modes, passengers, transmission, fuel, is_available, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, public_id, slug, name as string,
        (description as string) ?? '',
        typeof price === 'number' ? price : 0,
        typeof meta?.chauffeur_price === 'number' ? meta.chauffeur_price : 0,
        'AUD',
        (meta?.hire_modes as string) ?? 'chauffeured_only',
        (meta?.passengers as string) ?? '',
        (meta?.transmission as string) ?? 'Automatic',
        (meta?.fuel as string) ?? 'Petrol',
        Boolean(is_available) ? 1 : 0,
      ]
    )

    const imageList = (images as string[]) ?? []
    for (let i = 0; i < imageList.length; i++) {
      const mediaId = newId()
      await execute(
        'INSERT INTO VehicleMedia (id, vehicle_id, url, content_type, sort_order) VALUES (?, ?, ?, ?, ?)',
        [mediaId, id, imageList[i], guessContentType(imageList[i]), i]
      )
    }

    const vehicle = await queryOne('SELECT * FROM Vehicle WHERE id = ? LIMIT 1', [id])
    const mediaRows = await query('SELECT * FROM VehicleMedia WHERE vehicle_id = ? ORDER BY sort_order ASC', [id])
    return NextResponse.json({ ...vehicle, is_available: Boolean((vehicle as { is_available: number }).is_available), media: mediaRows })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function guessContentType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
  }
  return map[ext ?? ''] ?? 'image/jpeg'
}
