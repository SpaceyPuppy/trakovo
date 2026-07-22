import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import {
  BillingError,
  billingErrorResponse,
  deleteVoidedInvoice,
  getInvoice,
  issueInvoice,
  readBillingJsonObject,
  updateInvoiceDraft,
  voidInvoice,
} from '@/lib/billing'

interface Context { params: { id: string } }

export async function GET(_req: Request, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    return NextResponse.json(await getInvoice(params.id))
  } catch (error) {
    return billingErrorResponse(error)
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    await deleteVoidedInvoice({ actor: session.username, invoiceId: params.id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return billingErrorResponse(error)
  }
}

export async function PATCH(req: Request, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await readBillingJsonObject(req)
    const requestedAction = body.action ?? body.status
    const action = requestedAction === 'sent' || requestedAction === 'issued'
      ? 'issue'
      : requestedAction

    if (action === 'issue') {
      await issueInvoice({
        actor: session.username,
        invoiceId: params.id,
        issueDate: body.issue_date as string | null | undefined,
        dueDate: body.due_date as string | null | undefined,
      })
    } else if (action === 'void') {
      await voidInvoice({
        actor: session.username,
        invoiceId: params.id,
        reason: body.reason as string | null | undefined,
      })
    } else if (action === 'update' || action === undefined || action === 'draft') {
      await updateInvoiceDraft({
        actor: session.username,
        invoiceId: params.id,
        dueDate: body.due_date as string | null | undefined,
        notes: body.notes as string | null | undefined,
      })
    } else if (action === 'paid') {
      throw new BillingError(
        'Record a payment instead of directly changing invoice status',
        409,
        'payment_record_required'
      )
    } else {
      throw new BillingError('Invalid invoice action', 400, 'invalid_invoice_action')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return billingErrorResponse(error)
  }
}
