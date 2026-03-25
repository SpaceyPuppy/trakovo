import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'

const BASE = 'https://crazytel.io/api/v1'

async function crazytelGet(path: string, apiKey: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'X-Crazytel-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const apiKeyRow = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ?', ['crazytel_account_api_key'])
  const apiKey = apiKeyRow?.value?.trim()
  if (!apiKey) return NextResponse.json({ error: 'Account API key not set' }, { status: 400 })

  const [balanceData, numbersData] = await Promise.all([
    crazytelGet('/balance/', apiKey),
    crazytelGet('/phone-numbers', apiKey),
  ])

  const balance = balanceData?.balance ?? balanceData?.amount ?? balanceData?.credit ?? null

  // phone-numbers returns array directly or wrapped in data/results
  const rawNumbers: unknown[] = Array.isArray(numbersData)
    ? numbersData
    : (numbersData?.data ?? numbersData?.results ?? numbersData?.phone_numbers ?? [])

  const numbers: string[] = rawNumbers
    .map((n: unknown) => {
      if (typeof n === 'string') return n
      const obj = n as Record<string, string>
      return obj.did_number ?? obj.number ?? obj.did ?? obj.phone_number ?? ''
    })
    .filter(Boolean)

  return NextResponse.json({
    balance: balance != null ? String(balance) : null,
    numbers,
    account_found: Boolean(balanceData),
    numbers_found: Boolean(numbersData),
  })
}
