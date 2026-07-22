import { NextResponse } from 'next/server'
import { optionalString, readJsonObject, withAdminApi, ApiError } from '@/lib/api-route'
import { getSettings, upsertSettings } from '@/lib/settings'

const BILLING_SETTING_KEYS = [
  'billing_legal_name',
  'billing_abn',
  'billing_email',
  'billing_phone',
  'billing_address',
  'billing_invoice_footer',
  'billing_tax_mode',
  'billing_tax_rate_bps',
] as const

export const GET = withAdminApi(async () => {
  return NextResponse.json({ settings: await getSettings(BILLING_SETTING_KEYS) })
})

export const PATCH = withAdminApi(async request => {
  const body = await readJsonObject(request)
  const taxMode = optionalString(body.billing_tax_mode, 'billing_tax_mode', 20) || 'none'
  if (!['none', 'inclusive'].includes(taxMode)) {
    throw new ApiError('Tax mode must be none or inclusive')
  }
  const taxRateBps = Number(body.billing_tax_rate_bps ?? 1000)
  if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000) {
    throw new ApiError('Tax rate must be between 0% and 100%')
  }
  if (taxMode === 'inclusive' && taxRateBps === 0) {
    throw new ApiError('Inclusive tax rate must be greater than 0%')
  }

  const entries: Array<readonly [string, string]> = [
    ['billing_legal_name', optionalString(body.billing_legal_name, 'billing_legal_name', 191)],
    ['billing_abn', optionalString(body.billing_abn, 'billing_abn', 32)],
    ['billing_email', optionalString(body.billing_email, 'billing_email', 191)],
    ['billing_phone', optionalString(body.billing_phone, 'billing_phone', 50)],
    ['billing_address', optionalString(body.billing_address, 'billing_address', 2000)],
    ['billing_invoice_footer', optionalString(body.billing_invoice_footer, 'billing_invoice_footer', 5000)],
    ['billing_tax_mode', taxMode],
    ['billing_tax_rate_bps', String(taxRateBps)],
  ]
  await upsertSettings(entries)
  return NextResponse.json({ ok: true, settings: Object.fromEntries(entries) })
})
