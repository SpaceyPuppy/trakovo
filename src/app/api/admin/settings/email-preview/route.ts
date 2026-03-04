import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { renderTemplate, buildTemplateContext } from '@/lib/email-templates'
import { SAMPLE_BOOKING, SAMPLE_VEHICLE_NAME, SAMPLE_NOTE, type TemplateType } from '@/lib/email-template-defaults'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { template, templateType } = await req.json() as { template: string; templateType: string }

  if (!template || !templateType) {
    return NextResponse.json({ error: 'Missing template or templateType' }, { status: 400 })
  }

  const note = templateType === 'customer_quote' ? SAMPLE_NOTE : undefined
  const { vars, conditions } = await buildTemplateContext(
    SAMPLE_BOOKING,
    SAMPLE_VEHICLE_NAME,
    note,
  )
  const html = renderTemplate(template, vars, conditions)

  return NextResponse.json({ html })
}
