import type {
  BookingResponse,
  BookingResponseStatus,
  BookingStatus,
  HireType,
} from '@/types'

export interface BookingDatabaseRow<Status extends BookingResponseStatus = BookingResponseStatus> {
  id: string
  public_id: string
  status: Status
  hire_type: HireType
  service_type?: string | null
  start_date: string | Date
  end_date: string | Date
  total_days: number | string
  daily_rate: number | string
  total_cost: number | string
  vehicle_id?: string | null
  vehicle_name?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  driver_name?: string | null
  driver_dob?: string | null
  driver_licence_number?: string | null
  driver_licence_expiry?: string | null
  id_document_path?: string | null
  licence_document_path?: string | null
  is_enquiry?: boolean | number | null
  vendor_name?: string | null
  created_at: string | Date
}

function dateOnly(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
}

function timestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

/**
 * Canonical database-to-API mapping for bookings. Database money is always
 * stored as integer cents; public booking responses expose major currency
 * units for compatibility with the existing UI.
 */
export function mapBookingRow<Status extends BookingResponseStatus = BookingStatus>(
  row: BookingDatabaseRow<Status>
): BookingResponse<Status> {
  return {
    id: row.id,
    public_id: row.public_id,
    status: row.status,
    hire_type: row.hire_type,
    service_type: row.service_type ?? 'vehicle',
    start_date: dateOnly(row.start_date),
    end_date: dateOnly(row.end_date),
    total_days: Number(row.total_days),
    daily_rate: Number(row.daily_rate) / 100,
    total_cost: Number(row.total_cost) / 100,
    vehicle: row.vehicle_id
      ? { id: row.vehicle_id, name: row.vehicle_name ?? '' }
      : undefined,
    contact_name: row.contact_name ?? undefined,
    contact_email: row.contact_email ?? '',
    contact_phone: row.contact_phone ?? '',
    driver_name: row.driver_name ?? undefined,
    driver_dob: row.driver_dob ?? undefined,
    driver_licence_number: row.driver_licence_number ?? undefined,
    driver_licence_expiry: row.driver_licence_expiry ?? undefined,
    id_document_url: row.id_document_path
      ? `/api/uploads/${row.id_document_path}`
      : undefined,
    licence_document_url: row.licence_document_path
      ? `/api/uploads/${row.licence_document_path}`
      : undefined,
    is_enquiry: Boolean(row.is_enquiry),
    vendor_name: row.vendor_name ?? undefined,
    created_at: timestamp(row.created_at),
  }
}
