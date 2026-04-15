import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const statusesParam = searchParams.get('statuses') ?? 'confirmed,completed'
  const vendorId = searchParams.get('vendor_id')

  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

  const statuses = statusesParam.split(',').filter(s => ['pending','confirmed','completed','cancelled'].includes(s))
  if (statuses.length === 0) return NextResponse.json({ error: 'Invalid statuses' }, { status: 400 })

  const placeholders = statuses.map(() => '?').join(',')
  const params: unknown[] = [from, to, ...statuses]

  let sql = `
    SELECT b.id, b.public_id, b.status, b.hire_type, b.service_type,
           b.start_date, b.end_date, b.total_days, b.daily_rate, b.total_cost,
           b.contact_name, b.contact_email, b.vendor_id,
           v.name as vehicle_name, ve.name as vendor_name
    FROM Booking b
    LEFT JOIN Vehicle v ON b.vehicle_id = v.id
    LEFT JOIN Vendor ve ON b.vendor_id = ve.id
    WHERE b.start_date >= ?
      AND b.start_date <= ?
      AND b.is_enquiry = 0
      AND b.status IN (${placeholders})
  `

  if (vendorId) {
    sql += ' AND b.vendor_id = ?'
    params.push(vendorId)
  }

  sql += ' ORDER BY b.start_date ASC'

  const bookings = await query<{
    id: string; public_id: string; status: string; hire_type: string; service_type: string | null;
    start_date: string; end_date: string; total_days: number; daily_rate: number; total_cost: number;
    contact_name: string | null; contact_email: string; vendor_id: string | null;
    vehicle_name: string | null; vendor_name: string | null;
  }>(sql, params)

  return NextResponse.json({ bookings })
}
