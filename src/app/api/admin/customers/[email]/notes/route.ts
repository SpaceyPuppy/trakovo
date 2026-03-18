import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute, newId } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { email: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const email = decodeURIComponent(params.email)
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

  const id = newId()
  await execute(
    'INSERT INTO CustomerNote (id, contact_email, text, created_at) VALUES (?, ?, ?, NOW())',
    [id, email, text.trim()]
  )
  return NextResponse.json({ id, text: text.trim(), created_at: new Date().toISOString() }, { status: 201 })
}
