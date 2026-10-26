import { NextResponse } from 'next/server'
import { ApiError, optionalString, readJsonObject, requireString } from '@/lib/api-route'
import { saveContactEnquiry } from '@/lib/contact-enquiry'

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 20000)
    const name = requireString(body.name, 'Name', { maxLength: 191 })
    const email = requireString(body.email, 'Email', { maxLength: 191 })
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new ApiError('Please enter a valid email address')
    const phone = optionalString(body.phone, 'Phone', 80)
    const message = requireString(body.message, 'Message', { maxLength: 5000 })
    const publicId = await saveContactEnquiry({ name, email, phone, message })
    return NextResponse.json({ ok: true, public_id: publicId })
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[contact] Enquiry failed', error)
    return NextResponse.json({ error: 'Unable to send your message. Please try again.' }, { status: 500 })
  }
}
