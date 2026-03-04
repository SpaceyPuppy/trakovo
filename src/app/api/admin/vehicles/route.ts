import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma, generatePublicId } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const vehicles = await prisma.vehicle.findMany({
    include: { media: true },
    orderBy: { created_at: 'desc' },
  })
  return NextResponse.json(vehicles)
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const body = await req.json()
    const { name, description, price, is_available, images, meta } = body

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    let slug = slugify(name as string)
    const existing = await prisma.vehicle.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    const public_id = await generatePublicId('VHC')

    const vehicle = await prisma.vehicle.create({
      data: {
        public_id,
        slug,
        name: name as string,
        description: (description as string) ?? '',
        price: typeof price === 'number' ? price : 0,
        chauffeur_price: typeof meta?.chauffeur_price === 'number' ? meta.chauffeur_price : 0,
        currency: 'AUD',
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

function guessContentType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
  }
  return map[ext ?? ''] ?? 'image/jpeg'
}
