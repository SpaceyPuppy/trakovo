import { cache } from 'react'
import { getSettings } from './settings'
import { resolveTaxiBookingConfig, TAXI_BOOKING_SETTING_KEYS } from './taxi-booking-config'

export const getTaxiBookingConfig = cache(async () => {
  try {
    return resolveTaxiBookingConfig(await getSettings(TAXI_BOOKING_SETTING_KEYS))
  } catch {
    // Keep public pages usable if settings are unavailable, without exposing the online app.
    return resolveTaxiBookingConfig({})
  }
})
