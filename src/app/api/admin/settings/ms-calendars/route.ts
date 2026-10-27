import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getMicrosoftAccessToken, microsoftGraphRequest } from '@/lib/microsoft-token'
import { microsoftDiagnosticCode } from '@/lib/microsoft-errors'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const token = await getMicrosoftAccessToken()
    if (!token) return NextResponse.json({ error: 'Microsoft access could not be renewed. Check the client secret in cPanel and reconnect Microsoft.' }, { status: 401 })
    const res = await microsoftGraphRequest(
      'https://graph.microsoft.com/v1.0/me/calendars?$select=id,name&$top=50',
      {}, token
    )
    if (!res.ok) return NextResponse.json({ error: `Microsoft calendar access failed (HTTP ${res.status}). Check Calendars.ReadWrite consent and reconnect.` }, { status: 502 })
    const data = await res.json<{ value?: { id: string; name: string }[] }>()
    const calendars = (data.value ?? []).map((c: { id: string; name: string }) => ({
      id: c.id,
      name: c.name,
    }))
    return NextResponse.json({ calendars })
  } catch (error) {
    console.error('[ms-calendars] Request failed', { code: microsoftDiagnosticCode(error) })
    return NextResponse.json({ error: 'Unable to load Microsoft calendars. Check host HTTPS connectivity and the Microsoft connection.' }, { status: 502 })
  }
}
