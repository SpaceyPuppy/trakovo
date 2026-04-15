import { query, execute } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'
import ContactEnquiriesClient from './ContactEnquiriesClient'

export const metadata: Metadata = { title: 'Contact Enquiries' }
export const revalidate = 0

export default async function ContactEnquiriesPage() {
  const enquiries = await query<{
    id: string
    public_id: string
    name: string
    email: string
    phone: string
    message: string
    status: string
    created_at: Date
  }>('SELECT id, public_id, name, email, phone, message, status, created_at FROM ContactEnquiry ORDER BY created_at DESC')

  const serialised = enquiries.map(e => ({
    ...e,
    created_at: e.created_at instanceof Date ? e.created_at.toISOString() : String(e.created_at),
  }))

  return <ContactEnquiriesClient enquiries={serialised} />
}
