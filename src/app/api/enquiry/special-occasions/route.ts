import { NextResponse } from 'next/server'
import { ApiError, optionalString, readJsonObject, requireString } from '@/lib/api-route'
import { queryOne } from '@/lib/db'
import { OCCASIONS } from '@/lib/special-occasions'
import { saveContactEnquiry } from '@/lib/contact-enquiry'

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 20000)
    if (body.website) return NextResponse.json({ ok: true })
    const name = requireString(body.name, 'Name', { maxLength: 191 })
    const email = requireString(body.email, 'Email', { maxLength: 191 })
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new ApiError('Please enter a valid email address')
    const phone = optionalString(body.phone, 'Phone', 80)
    const occasion = OCCASIONS.find(item => item.id === body.occasion)?.label
      ?? (body.occasion === 'corporate' ? 'Corporate Function or Event' : null)
    if (!occasion) throw new ApiError('Please choose an occasion')
    const date = optionalString(body.event_date, 'Event date', 10)
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new ApiError('Please enter a valid event date')
    const passengers = optionalString(body.passengers, 'Passengers', 4)
    if (passengers && (!/^\d+$/.test(passengers) || Number(passengers) < 1 || Number(passengers) > 1000)) throw new ApiError('Passengers must be between 1 and 1000')
    const vehicleId = optionalString(body.vehicle_id, 'Vehicle', 191)
    let vehicleName = 'Please suggest options'
    if (vehicleId) {
      const vehicle = await queryOne<{ name: string }>('SELECT name FROM Vehicle WHERE id = ? AND is_available = 1 AND public_bookings_enabled = 1 AND show_on_special_occasions = 1', [vehicleId])
      if (!vehicle) throw new ApiError('That vehicle is no longer showcased. Please select another option.')
      vehicleName = vehicle.name
    }
    const message = [
      `Special Occasions — ${occasion}`,
      `Event date: ${date || 'To be confirmed'}`,
      `Pickup: ${optionalString(body.pickup, 'Pickup', 300) || 'To be confirmed'}`,
      `Venue / destination: ${optionalString(body.destination, 'Destination', 300) || 'To be confirmed'}`,
      `Passengers: ${passengers || 'To be confirmed'}`,
      `Preferred vehicle: ${vehicleName}`,
      '', requireString(body.message, 'Your plans', { maxLength: 5000 }),
    ].join('\n')
    const publicId = await saveContactEnquiry({ name, email, phone, message }, 'Special Occasions')
    return NextResponse.json({ ok: true, public_id: publicId }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[special-occasions] Enquiry failed', error)
    return NextResponse.json({ error: 'Unable to send your enquiry. Please try again.' }, { status: 500 })
  }
}
