import type { BookingResponse } from '@/types'

// ─── Placeholder & conditional metadata ─────────────────────────────────────

export const PLACEHOLDERS = [
  { name: 'booking_ref', description: 'Booking reference (e.g. VHB-0042)' },
  { name: 'vehicle_name', description: 'Vehicle name' },
  { name: 'hire_type', description: '"Chauffeured Hire" or "Dry Hire (Self-Drive)"' },
  { name: 'start_date', description: 'Start date' },
  { name: 'end_date', description: 'End date' },
  { name: 'total_days', description: 'Number of days' },
  { name: 'daily_rate', description: 'Daily rate (e.g. $450 AUD)' },
  { name: 'total_cost', description: 'Total cost (e.g. $1350 AUD)' },
  { name: 'contact_name', description: 'Contact or driver name' },
  { name: 'contact_email', description: 'Contact email' },
  { name: 'contact_phone', description: 'Contact phone' },
  { name: 'driver_name', description: 'Driver name (dry hire)' },
  { name: 'driver_dob', description: 'Driver date of birth' },
  { name: 'driver_licence_number', description: 'Driver licence number' },
  { name: 'driver_licence_expiry', description: 'Driver licence expiry' },
  { name: 'site_name', description: 'Site/business name' },
  { name: 'site_url', description: 'Site URL' },
  { name: 'admin_url', description: 'Admin bookings URL' },
  { name: 'note', description: 'Staff note (customer quote only)' },
  { name: 'created_at', description: 'Booking creation timestamp' },
] as const

export const CONDITIONALS = [
  { name: 'is_dry_hire', description: 'Content shown only for dry-hire bookings' },
  { name: 'is_chauffeured', description: 'Content shown only for chauffeured bookings' },
  { name: 'note', description: 'Content shown only when a staff note is included' },
] as const

// ─── Sample data for live preview ───────────────────────────────────────────

export const SAMPLE_BOOKING: BookingResponse = {
  id: 'sample',
  public_id: 'VHB-0042',
  status: 'pending',
  hire_type: 'dry-hire',
  start_date: '2026-03-15',
  end_date: '2026-03-18',
  total_days: 3,
  daily_rate: 450,
  total_cost: 1350,
  vehicle: { id: 'v1', name: '2024 Mercedes Sprinter' },
  contact_name: 'Jane Smith',
  contact_email: 'jane@example.com',
  contact_phone: '+61 400 123 456',
  driver_name: 'Jane Smith',
  driver_dob: '1990-05-15',
  driver_licence_number: 'DL12345678',
  driver_licence_expiry: '2028-01-01',
  created_at: new Date().toISOString(),
}

export const SAMPLE_VEHICLE_NAME = '2024 Mercedes Sprinter'
export const SAMPLE_NOTE = 'We have adjusted the daily rate to reflect a multi-day discount. Please review and let us know if you have any questions.'

// ─── Row helper (used in default templates) ─────────────────────────────────

function row(label: string, value: string, highlight = false) {
  return `
      <tr style="border-bottom:1px solid #e8e6e0;">
        <td style="padding:11px 0;font-size:12px;color:#888;width:44%;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${label}</td>
        <td style="padding:11px 0;font-size:${highlight ? '16' : '13.5'}px;color:${highlight ? '#d4570a' : '#1a1a1a'};font-weight:${highlight ? '800' : '600'};text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${value}</td>
      </tr>`
}

// ─── Default: Booking Notification (Admin) ──────────────────────────────────

export const TEMPLATE_BOOKING_NOTIFICATION = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>New Booking {{booking_ref}}</title></head>
<body style="margin:0;padding:0;background:#f0efe9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0efe9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e0d8;">

        <tr>
          <td style="background:#1a2235;padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <span style="display:inline-block;background:#d4570a;color:#fff;font-weight:800;font-size:13px;padding:4px 8px;border-radius:4px;letter-spacing:0.05em;">A</span>
                <span style="color:#fff;font-weight:700;font-size:15px;margin-left:8px;vertical-align:middle;letter-spacing:-0.01em;">{{site_name}}</span>
                <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:4px 0 0 0;text-transform:uppercase;letter-spacing:0.08em;">Admin Notification</p>
              </td>
              <td align="right">
                <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;text-transform:uppercase;letter-spacing:0.08em;">New Booking Request</p>
                <p style="color:#d4570a;font-size:22px;font-weight:700;margin:4px 0 0 0;font-family:monospace;">{{booking_ref}}</p>
              </td>
            </tr></table>
          </td>
        </tr>

        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 24px;font-size:15px;color:#1a1a1a;">
            A new <strong>{{hire_type}}</strong> booking has been submitted for <strong>{{vehicle_name}}</strong>.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2;border-radius:8px;margin-bottom:24px;overflow:hidden;border:1px solid #e2e0d8;">
            <tr><td style="padding:14px 18px;border-bottom:1px solid #e2e0d8;background:#f0efe9;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Booking Summary</p>
            </td></tr>
            <tr><td style="padding:0 18px;">
              <table width="100%" cellpadding="0" cellspacing="0">${row('Booking Ref', '{{booking_ref}}')}${row('Vehicle', '{{vehicle_name}}')}${row('Hire Type', '{{hire_type}}')}${row('Start Date', '{{start_date}}')}${row('End Date', '{{end_date}}')}${row('Duration', '{{total_days}} days')}${row('Daily Rate', '{{daily_rate}}')}${row('Estimated Total', '{{total_cost}}')}</table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2;border-radius:8px;margin-bottom:24px;overflow:hidden;border:1px solid #e2e0d8;">
            <tr><td style="padding:14px 18px;border-bottom:1px solid #e2e0d8;background:#f0efe9;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Contact Details</p>
            </td></tr>
            <tr><td style="padding:0 18px;">
              <table width="100%" cellpadding="0" cellspacing="0">${row('Name', '{{contact_name}}')}${row('Email', '{{contact_email}}')}${row('Phone', '{{contact_phone}}')}</table>
            </td></tr>
          </table>

          {{#if is_dry_hire}}
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf5;border-radius:8px;margin-bottom:24px;overflow:hidden;border:1px solid #f0d8b8;">
            <tr><td style="padding:14px 18px;border-bottom:1px solid #f0d8b8;background:#fdf0e0;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#c07030;text-transform:uppercase;letter-spacing:0.1em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Driver Details (Verification Required)</p>
            </td></tr>
            <tr><td style="padding:0 18px;">
              <table width="100%" cellpadding="0" cellspacing="0">${row('Driver Name', '{{driver_name}}')}${row('Date of Birth', '{{driver_dob}}')}${row('Licence Number', '{{driver_licence_number}}')}${row('Licence Expiry', '{{driver_licence_expiry}}')}</table>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#888;margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            ID and licence documents are available in the admin panel.
          </p>
          {{/if is_dry_hire}}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr><td align="center">
              <a href="{{admin_url}}"
                style="display:inline-block;background:#1a2235;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:6px;text-decoration:none;letter-spacing:-0.01em;">
                View in Admin Panel &rarr;
              </a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:20px 36px;border-top:1px solid #e2e0d8;background:#f7f6f2;">
          <p style="margin:0;font-size:12px;color:#aaa;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            This notification was sent automatically by {{site_name}}.<br>
            To change the notification email, visit Admin &rarr; Settings.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

// ─── Default: Customer Quote ────────────────────────────────────────────────

export const TEMPLATE_CUSTOMER_QUOTE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Updated Quote {{booking_ref}}</title></head>
<body style="margin:0;padding:0;background:#f0efe9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0efe9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e0d8;">
        <tr>
          <td style="background:#1a2235;padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <span style="display:inline-block;background:#d4570a;color:#fff;font-weight:800;font-size:13px;padding:4px 8px;border-radius:4px;">&nbsp;A&nbsp;</span>
                <span style="color:#fff;font-weight:700;font-size:15px;margin-left:8px;vertical-align:middle;">{{site_name}}</span>
              </td>
              <td align="right">
                <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;text-transform:uppercase;letter-spacing:0.08em;">Updated Quote</p>
                <p style="color:#d4570a;font-size:22px;font-weight:700;margin:4px 0 0 0;font-family:monospace;">{{booking_ref}}</p>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;">Hi <strong>{{contact_name}}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.65;">
            We've updated the pricing for your <strong>{{hire_type}}</strong> booking for the <strong>{{vehicle_name}}</strong>. Please find your updated quote below.
          </p>
          {{#if note}}
          <div style="background:#fffaf5;border:1px solid #f0d8b8;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#c07030;text-transform:uppercase;letter-spacing:0.1em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Message from our team</p>
            <p style="margin:0;font-size:14px;color:#3a3a3a;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">{{note}}</p>
          </div>
          {{/if note}}
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2;border-radius:8px;margin-bottom:24px;overflow:hidden;border:1px solid #e2e0d8;">
            <tr><td style="padding:14px 18px;border-bottom:1px solid #e2e0d8;background:#f0efe9;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Your Updated Quote</p>
            </td></tr>
            <tr><td style="padding:0 18px;">
              <table width="100%" cellpadding="0" cellspacing="0">${row('Booking Ref', '{{booking_ref}}')}${row('Vehicle', '{{vehicle_name}}')}${row('Hire Type', '{{hire_type}}')}${row('Start Date', '{{start_date}}')}${row('End Date', '{{end_date}}')}${row('Duration', '{{total_days}} days')}${row('Daily Rate', '{{daily_rate}}')}${row('Total Cost', '{{total_cost}}', true)}</table>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#888;margin:0 0 24px;line-height:1.6;">
            If you have any questions about this quote, please don't hesitate to get in touch with our team.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="{{site_url}}/vehicles" style="display:inline-block;background:#d4570a;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:6px;text-decoration:none;">View Our Fleet &rarr;</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid #e2e0d8;background:#f7f6f2;">
          <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">This quote was sent by {{site_name}}. Booking reference: {{booking_ref}}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

// ─── Template metadata ──────────────────────────────────────────────────────

export const TEMPLATE_META = {
  booking_notification: {
    key: 'email_template_booking_notification',
    label: 'Booking Notification (Admin)',
    description: 'Sent to the admin when a new booking is submitted.',
    default: TEMPLATE_BOOKING_NOTIFICATION,
  },
  customer_quote: {
    key: 'email_template_customer_quote',
    label: 'Customer Quote',
    description: 'Sent to the customer when you update their quote.',
    default: TEMPLATE_CUSTOMER_QUOTE,
  },
} as const

export type TemplateType = keyof typeof TEMPLATE_META
