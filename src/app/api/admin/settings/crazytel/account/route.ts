import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'

const BASE = 'https://sms.crazytel.net.au/api/v1'

// Mask email: j***@example.com
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  return `${local[0]}***@${domain}`
}

async function crazytelGet(path: string, apiKey: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const apiKeyRow = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ?', ['crazytel_api_key'])
  const apiKey = apiKeyRow?.value?.trim()
  if (!apiKey) return NextResponse.json({ error: 'API key not set' }, { status: 400 })

  // Try common account info endpoint patterns
  const account = await crazytelGet('/account', apiKey)
    ?? await crazytelGet('/me', apiKey)
    ?? await crazytelGet('/user', apiKey)

  // Try common DID/number listing endpoint patterns
  const numbersData = await crazytelGet('/dids', apiKey)
    ?? await crazytelGet('/numbers', apiKey)
    ?? await crazytelGet('/caller-ids', apiKey)
    ?? await crazytelGet('/senders', apiKey)

  const email = account?.email ?? account?.user?.email ?? account?.account?.email ?? null
  const balance = account?.balance ?? account?.credit ?? account?.account?.balance ?? null
  const numbers: string[] = (
    numbersData?.dids ?? numbersData?.numbers ?? numbersData?.data ?? numbersData?.caller_ids ?? []
  ).map((n: unknown) => (typeof n === 'string' ? n : (n as Record<string, string>).number ?? (n as Record<string, string>).did ?? (n as Record<string, string>).value)).filter(Boolean)

  return NextResponse.json({
    email: email ? maskEmail(String(email)) : null,
    balance: balance != null ? String(balance) : null,
    numbers,
    // Flag for UI to show "endpoints not found" message if both came back null
    account_found: Boolean(account),
    numbers_found: Boolean(numbersData),
  })
}
