export interface TaxiBookingConfig {
  onlineBookingEnabled: boolean
  phone: string
  phoneHref: string | null
}

export const TAXI_BOOKING_SETTING_KEYS = [
  'taxi_online_booking_enabled', 'taxi_booking_phone',
] as const

export const DEFAULT_TAXI_BOOKING_PHONE = '0488 838 442'

export function taxiPhoneHref(phone: string): string | null {
  const compact = phone.replace(/[\s().-]/g, '')
  return /^\+?\d{6,15}$/.test(compact) ? `tel:${compact}` : null
}

export function resolveTaxiBookingConfig(settings: Record<string, string>): TaxiBookingConfig {
  const phone = settings.taxi_booking_phone?.trim() || DEFAULT_TAXI_BOOKING_PHONE
  return {
    // Phone bookings are the default until an administrator explicitly launches online booking.
    onlineBookingEnabled: settings.taxi_online_booking_enabled === '1',
    phone,
    phoneHref: taxiPhoneHref(phone),
  }
}
