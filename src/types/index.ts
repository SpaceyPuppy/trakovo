// ─── Core types ───────────────────────────────────────────────────────────────

export type HireMode = 'chauffeured_only' | 'both'

export interface DayRate {
  days_from: number
  days_to: number | null   // null = open-ended (no upper limit)
  price: number            // in dollars in form/API, cents in DB
  price_poa: boolean
  chauffeur_price: number
  chauffeur_price_poa: boolean
}
export type HireType = 'chauffeured' | 'dry-hire'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type BookingResponseStatus = BookingStatus | 'enquiry'

export interface VehicleMedia {
  id: string
  url: string
  content_type: string
}

export interface Vehicle {
  id: string
  public_id: string
  slug: string
  name: string
  description: string
  price: number          // dry-hire daily rate (dollars)
  price_poa: boolean
  chauffeur_price: number
  chauffeur_price_poa: boolean
  day_rates: DayRate[]
  currency: string
  category?: { id: string; name: string; slug: string }
  media: VehicleMedia[]
  meta: {
    hire_modes?: HireMode
    passengers?: string | number
    transmission?: string
    fuel?: string
    licence_category?: string
    chauffeur_price?: number
  }
  tags?: string[]
  is_available: boolean
  public_bookings_enabled: boolean
  vendor_bookings_enabled: boolean
  created_at: string
  updated_at: string
}

export interface AvailabilityRange {
  start: string  // ISO date
  end: string    // ISO date
}

// ─── Trip schedule ────────────────────────────────────────────────────────────

export interface TripLeg {
  date: string        // YYYY-MM-DD — specific date for this leg
  pickup: string
  dropoff: string
  pickupTime: string   // at least one of pickupTime/dropoffTime should be provided
  dropoffTime: string
}

// ─── Booking submission ───────────────────────────────────────────────────────

export interface ChauffeuredBookingPayload {
  product_id: string
  hire_type: 'chauffeured'
  start_date: string   // YYYY-MM-DD
  end_date: string     // YYYY-MM-DD
  contact_name: string
  contact_email: string
  contact_phone: string
  trip_details?: string  // JSON stringified trip schedule
}

export interface DryHireBookingPayload {
  product_id: string
  hire_type: 'dry-hire'
  start_date: string
  end_date: string
  contact_name: string
  contact_email: string
  contact_phone: string
  driver_name: string    // actual driver (may differ from contact if contact is under 25)
  driver_dob: string     // actual driver's DOB
  agreement_accepted: true
}

export type BookingPayload = ChauffeuredBookingPayload | DryHireBookingPayload

export interface BookingResponse<Status extends BookingResponseStatus = BookingStatus> {
  id: string
  public_id: string   // VHB-xxxx
  status: Status
  hire_type: HireType
  service_type?: string   // 'vehicle' | 'taxi' | 'cpv'
  start_date: string
  end_date: string
  total_days: number
  daily_rate: number
  total_cost: number
  vehicle?: { id: string; name: string }
  contact_name?: string
  contact_email: string
  contact_phone: string
  driver_name?: string
  driver_dob?: string
  driver_licence_number?: string
  driver_licence_expiry?: string
  id_document_url?: string
  licence_document_url?: string
  is_enquiry?: boolean
  vendor_name?: string
  created_at: string
}

export type BookingCreationResponse = BookingResponse<BookingResponseStatus>

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminSession {
  username: string
  exp: number
}

export interface DriverSession {
  driverId: string
  driverName: string
  exp: number
}

export interface VehicleFormData {
  name: string
  description: string
  price: number
  price_poa: boolean
  chauffeur_price: number
  chauffeur_price_poa: boolean
  day_rates: DayRate[]
  hire_modes: HireMode
  passengers: string
  transmission: string
  fuel: string
  licence_category: string
  is_available: boolean
  public_bookings_enabled: boolean
  vendor_bookings_enabled: boolean
  images: string[]
}

export interface Setting {
  key: string
  value: string
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface BookingFormState {
  hireType: HireType | null
  startDate: Date | null
  endDate: Date | null
  // chauffeured + shared
  contactName: string
  contactEmail: string
  contactPhone: string
  // dry hire — booker details
  driverName: string
  driverDob: string
  agreed: boolean
  // dry hire — under-25 alternate driver
  under25Confirmed: boolean
  altDriverName: string
  altDriverDob: string
  // chauffeured — trip schedule
  tripLegs: TripLeg[]
  returnMode: 'none' | 'same' | 'different'
  returnTime: string
  passengerCount: string
  tripPurpose: string   // 'personal' | 'business' | ''
}

export function freshBookingState(): BookingFormState {
  return {
    hireType: null, startDate: null, endDate: null,
    contactName: '', contactEmail: '', contactPhone: '',
    driverName: '', driverDob: '', agreed: false,
    under25Confirmed: false, altDriverName: '', altDriverDob: '',
    tripLegs: [{ date: '', pickup: '', dropoff: '', pickupTime: '', dropoffTime: '' }],
    returnMode: 'none', returnTime: '', passengerCount: '', tripPurpose: '',
  }
}
