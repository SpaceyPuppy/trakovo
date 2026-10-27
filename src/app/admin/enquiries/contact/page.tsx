import type { Metadata } from 'next'
import ContactEnquiriesClient from './ContactEnquiriesClient'
import { getWebsiteEnquiries } from '@/lib/website-enquiries'

export const metadata: Metadata = { title: 'Contact Enquiries' }
export const revalidate = 0

export default async function ContactEnquiriesPage() {
  return <ContactEnquiriesClient enquiries={await getWebsiteEnquiries()} />
}
