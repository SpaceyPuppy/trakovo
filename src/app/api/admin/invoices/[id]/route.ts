import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne, execute } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { status, due_date, paid_at, notes } = body

  if (status !== undefined && !['draft', 'sent', 'paid', 'void'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const invoice = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM Invoice WHERE id = ? LIMIT 1', [params.id]
  )
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  // Auto-set paid_at when marking as paid
  const resolvedPaidAt = status === 'paid' ? (paid_at ?? null) : (status && status !== 'paid' ? null : undefined)

  const fields: string[] = ['updated_at = NOW()']
  const values: unknown[] = []

  if (status !== undefined) { fields.push('status = ?'); values.push(status) }
  if (due_date !== undefined) { fields.push('due_date = ?'); values.push(due_date ?? null) }
  if (notes !== undefined) { fields.push('notes = ?'); values.push(notes ?? null) }
  if (status === 'paid') {
    fields.push('paid_at = IFNULL(?, NOW())')
    values.push(paid_at ?? null)
  } else if (status !== undefined && status !== 'paid') {
    fields.push('paid_at = NULL')
  }

  values.push(params.id)
  await execute(`UPDATE Invoice SET ${fields.join(', ')} WHERE id = ?`, values)

  return NextResponse.json({ ok: true })
}
