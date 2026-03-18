import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, queryOne, execute, newId } from '@/lib/db'

interface Context { params: { id: string } }

export async function PUT(req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const body = await req.json()
    const { name, description, price, is_available, public_bookings_enabled, vendor_bookings_enabled, images, meta } = body

    // Replace all media (delete + recreate)
    await execute('DELETE FROM VehicleMedia WHERE vehicle_id = ?', [params.id])

    const dayRates = Array.isArray(meta?.day_rates) ? JSON.stringify(meta.day_rates) : null

    await execute(
      `UPDATE Vehicle SET name = ?, description = ?, price = ?, chauffeur_price = ?, price_poa = ?, chauffeur_price_poa = ?, day_rates = ?, hire_modes = ?, passengers = ?, transmission = ?, fuel = ?, is_available = ?, public_bookings_enabled = ?, vendor_bookings_enabled = ?, updated_at = NOW() WHERE id = ?`,
      [
        name as string,
        (description as string) ?? '',
        typeof price === 'number' ? price : 0,
        typeof meta?.chauffeur_price === 'number' ? meta.chauffeur_price : 0,
        Boolean(meta?.price_poa) ? 1 : 0,
        Boolean(meta?.chauffeur_price_poa) ? 1 : 0,
        dayRates,
        (meta?.hire_modes as string) ?? 'chauffeured_only',
        (meta?.passengers as string) ?? '',
        (meta?.transmission as string) ?? 'Automatic',
        (meta?.fuel as string) ?? 'Petrol',
        Boolean(is_available) ? 1 : 0,
        public_bookings_enabled === false ? 0 : 1,
        vendor_bookings_enabled === false ? 0 : 1,
        params.id,
      ]
    )

    const imageList = (images as string[]) ?? []
    for (let i = 0; i < imageList.length; i++) {
      const mediaId = newId()
      await execute(
        'INSERT INTO VehicleMedia (id, vehicle_id, url, content_type, sort_order) VALUES (?, ?, ?, ?, ?)',
        [mediaId, params.id, imageList[i], guessContentType(imageList[i]), i]
      )
    }

    const vehicle = await queryOne('SELECT * FROM Vehicle WHERE id = ? LIMIT 1', [params.id])
    const mediaRows = await query('SELECT * FROM VehicleMedia WHERE vehicle_id = ? ORDER BY sort_order ASC', [params.id])
    return NextResponse.json({ ...vehicle, is_available: Boolean((vehicle as { is_available: number }).is_available), media: mediaRows })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const row = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Booking WHERE vehicle_id = ?', [params.id])
    const bookingCount = row?.count ?? 0
    if (bookingCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${bookingCount} booking(s) exist for this vehicle.` },
        { status: 409 }
      )
    }
    await execute('DELETE FROM Vehicle WHERE id = ?', [params.id])
    return NextResponse.json({ ok: true })
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
