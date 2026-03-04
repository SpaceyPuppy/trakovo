import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface Context { params: { id: string } }

export async function PUT(req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const body = await req.json()
    const { name, description, price, is_available, images, meta } = body

    // Replace all media (delete + recreate)
    await prisma.vehicleMedia.deleteMany({ where: { vehicle_id: params.id } })

    const vehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        name: name as string,
        description: (description as string) ?? '',
        price: typeof price === 'number' ? price : 0,
        chauffeur_price: typeof meta?.chauffeur_price === 'number' ? meta.chauffeur_price : 0,
        hire_modes: (meta?.hire_modes as string) ?? 'chauffeured_only',
        passengers: (meta?.passengers as string) ?? '',
        transmission: (meta?.transmission as string) ?? 'Automatic',
        fuel: (meta?.fuel as string) ?? 'Petrol',
        is_available: Boolean(is_available),
        media: {
          create: ((images as string[]) ?? []).map((url, i) => ({
            url,
            content_type: guessContentType(url),
            sort_order: i,
          })),
        },
      },
      include: { media: true },
    })

    return NextResponse.json(vehicle)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const bookingCount = await prisma.booking.count({ where: { vehicle_id: params.id } })
    if (bookingCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${bookingCount} booking(s) exist for this vehicle.` },
        { status: 409 }
      )
    }
    await prisma.vehicle.delete({ where: { id: params.id } })
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
