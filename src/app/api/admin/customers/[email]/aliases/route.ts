import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, execute, newId } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { email: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const email = decodeURIComponent(params.email)
  const aliases = await query<{ id: string; alias_email: string; created_at: Date }>(
    'SELECT id, alias_email, created_at FROM CustomerAlias WHERE primary_email = ? ORDER BY created_at ASC',
    [email]
  )
  return NextResponse.json({ aliases })
}

export async function POST(req: NextRequest, { params }: { params: { email: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const primaryEmail = decodeURIComponent(params.email)
  const { alias_email } = await req.json()
  if (!alias_email?.trim()) return NextResponse.json({ error: 'alias_email is required' }, { status: 400 })

  const aliasEmail = alias_email.trim().toLowerCase()
  if (aliasEmail === primaryEmail.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot link an email to itself' }, { status: 400 })
  }

  const id = newId()
  try {
    await execute(
      'INSERT INTO CustomerAlias (id, primary_email, alias_email, created_at) VALUES (?, ?, ?, NOW())',
      [id, primaryEmail, aliasEmail]
    )
  } catch {
    return NextResponse.json({ error: 'That email is already linked to a profile' }, { status: 409 })
  }

  return NextResponse.json({ id, alias_email: aliasEmail }, { status: 201 })
}
