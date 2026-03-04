import { prisma } from './db'
import type { BookingResponse } from '@/types'
import { TEMPLATE_META, type TemplateType } from './email-template-defaults'

// ─── Template rendering ─────────────────────────────────────────────────────

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
  conditions: Record<string, boolean>,
): string {
  // 1. Process conditionals: {{#if name}}...{{/if name}}
  let result = template
  for (const [name, value] of Object.entries(conditions)) {
    const regex = new RegExp(`\\{\\{#if ${name}\\}\\}([\\s\\S]*?)\\{\\{/if ${name}\\}\\}`, 'g')
    result = result.replace(regex, value ? '$1' : '')
  }

  // 2. Replace {{placeholder}} variables
  for (const [name, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${name}}}`, value)
  }

  return result
}

// ─── Build context maps from booking data ───────────────────────────────────

export function buildTemplateContext(
  booking: BookingResponse,
  vehicleName: string,
  note?: string,
): { vars: Record<string, string>; conditions: Record<string, boolean> } {
  const isChauffeured = booking.hire_type === 'chauffeured'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Trakovo'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  return {
    vars: {
      booking_ref: booking.public_id,
      vehicle_name: vehicleName,
      hire_type: isChauffeured ? 'Chauffeured Hire' : 'Dry Hire (Self-Drive)',
      start_date: booking.start_date,
      end_date: booking.end_date,
      total_days: String(booking.total_days),
      daily_rate: `$${booking.daily_rate.toFixed(0)} AUD`,
      total_cost: `$${booking.total_cost.toFixed(0)} AUD`,
      contact_name: isChauffeured
        ? (booking.contact_name ?? 'there')
        : (booking.driver_name ?? 'there'),
      contact_email: booking.contact_email,
      contact_phone: booking.contact_phone,
      driver_name: booking.driver_name ?? '—',
      driver_dob: booking.driver_dob ?? '—',
      driver_licence_number: booking.driver_licence_number ?? '—',
      driver_licence_expiry: booking.driver_licence_expiry ?? '—',
      site_name: siteName,
      site_url: siteUrl,
      admin_url: `${siteUrl}/admin/bookings`,
      note: note ? note.replace(/\n/g, '<br>') : '',
      created_at: booking.created_at,
    },
    conditions: {
      is_dry_hire: !isChauffeured,
      is_chauffeured: isChauffeured,
      note: !!note,
    },
  }
}

// ─── Load template from DB (with default fallback) ──────────────────────────

export async function getTemplate(type: TemplateType): Promise<string> {
  const meta = TEMPLATE_META[type]
  const row = await prisma.setting.findUnique({ where: { key: meta.key } })
  if (row?.value?.trim()) return row.value
  return meta.default
}
