export const SMS_TEMPLATE_META = {
  sms_taxi_customer: {
    key: 'sms_template_taxi_customer',
    enabledKey: 'sms_template_taxi_customer_enabled',
    label: 'Taxi Booking — Customer Confirmation',
    description: 'Sent to the customer\'s phone when they confirm a taxi booking.',
    default: 'Hi {{contact_name}}, your taxi booking has been received. Heading to {{destination}}. ETA approx {{eta_mins}} min. Ref: {{booking_ref}}',
    placeholders: [
      { name: 'contact_name', description: 'Customer\'s name' },
      { name: 'contact_phone', description: 'Customer\'s phone number' },
      { name: 'pickup', description: 'Pickup address' },
      { name: 'destination', description: 'Drop-off address' },
      { name: 'eta_mins', description: 'Estimated travel time in minutes' },
      { name: 'booking_ref', description: 'Booking reference (e.g. VHB-0042)' },
    ],
  },
  sms_taxi_dispatch: {
    key: 'sms_template_taxi_dispatch',
    enabledKey: 'sms_template_taxi_dispatch_enabled',
    label: 'Taxi Booking — Dispatch Alert',
    description: 'Sent to the dispatch number when a new taxi booking is created.',
    default: 'New taxi booking — {{contact_name}} ({{contact_phone}}). From: {{pickup}}. To: {{destination}}. ETA: {{eta_mins}} min. Ref: {{booking_ref}}',
    placeholders: [
      { name: 'contact_name', description: 'Customer\'s name' },
      { name: 'contact_phone', description: 'Customer\'s phone number' },
      { name: 'pickup', description: 'Pickup address' },
      { name: 'destination', description: 'Drop-off address' },
      { name: 'eta_mins', description: 'Estimated travel time in minutes' },
      { name: 'booking_ref', description: 'Booking reference (e.g. VHB-0042)' },
    ],
  },
} as const

export type SmsTemplateKey = keyof typeof SMS_TEMPLATE_META

export function renderSmsBody(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}
