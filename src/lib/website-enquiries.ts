import { query } from './db'

export interface WebsiteEnquiry {
  id: string; public_id: string; name: string; email: string; phone: string
  message: string; status: string; created_at: string
  source: 'contact' | 'corporate'
}

/** Include historical corporate records without migrating or duplicating customer data. */
export async function getWebsiteEnquiries(): Promise<WebsiteEnquiry[]> {
  type Row = Omit<WebsiteEnquiry, 'source' | 'created_at'> & { created_at: Date | string }
  const contacts = await query<Row>('SELECT id, public_id, name, email, phone, message, status, created_at FROM ContactEnquiry ORDER BY created_at DESC')
  let corporate: Array<Row & { organisation?: string; event_type?: string; guests?: string }> = []
  try {
    corporate = await query('SELECT id, public_id, name, email, phone, organisation, event_type, guests, message, status, created_at FROM CorporateEnquiry ORDER BY created_at DESC')
  } catch (error) {
    // Older installations may never have created the legacy corporate-only table.
    if ((error as { code?: string }).code !== 'ER_NO_SUCH_TABLE') throw error
  }
  return [
    ...contacts.map(row => ({ ...row, source: 'contact' as const })),
    ...corporate.map(row => ({ ...row, source: 'corporate' as const, phone: row.phone ?? '', message: [
      'Corporate Enquiry', `Organisation: ${row.organisation || 'Not provided'}`,
      `Event type: ${row.event_type || 'To be confirmed'}`, `Guests / passengers: ${row.guests || 'To be confirmed'}`, '', row.message,
    ].join('\n') })),
  ].map(row => ({ ...row, created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at) }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
