export const SMS_TEMPLATE_META = {
  sms_taxi_customer: {
    key: 'sms_template_taxi_customer',
    enabledKey: 'sms_template_taxi_customer_enabled',
    label: 'Taxi Booking — Customer Confirmation',
    description: 'Sent to the customer\'s phone when they confirm a taxi booking.',
    default: '{{contact_name}}, your booking has been received to leave from {{pickup}}. We\'ll confirm this with you ASAP. Booking {{booking_ref}} -CKB',
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
    default: 'New Taxi Req: {{contact_name}} ({{contact_phone}})\n\nFrom {{pickup}}\nto {{destination}}.\n\n{{booking_ref}}',
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
