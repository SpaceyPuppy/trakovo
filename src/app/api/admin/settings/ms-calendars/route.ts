import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getMsAccessToken } from '@/lib/calendar'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const token = await getMsAccessToken()
  if (!token) return NextResponse.json({ calendars: [] })

  try {
    const res = await fetch(
      'https://graph.microsoft.com/v1.0/me/calendars?$select=id,name&$top=50',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return NextResponse.json({ calendars: [] })
    const data = await res.json()
    const calendars = (data.value ?? []).map((c: { id: string; name: string }) => ({
      id: c.id,
      name: c.name,
    }))
    return NextResponse.json({ calendars })
  } catch {
    return NextResponse.json({ calendars: [] })
  }
}
