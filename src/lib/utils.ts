import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-AU', opts ?? { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isDateInRanges(
  date: Date,
  ranges: Array<{ start: string; end: string }>
): boolean {
  const t = date.getTime()
  return ranges.some(r => {
    // Parse as local midnight (appending T00:00:00 avoids UTC interpretation)
    const s = new Date(r.start + 'T00:00:00').getTime()
    const e = new Date(r.end + 'T00:00:00').getTime()
    return t >= s && t <= e
  })
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function getVehicleImage(vehicle: { media: Array<{ url: string }> }): string | null {
  return vehicle.media?.[0]?.url ?? null
}

/**
 * Returns the daily rate for a given hire type and number of days,
 * applying day-range tier pricing if a matching tier exists.
 * Falls back to the vehicle base price when no tier matches.
 */
export function getDailyRate(
  vehicle: { price: number; chauffeur_price: number; day_rates: Array<{ days_from: number; days_to: number | null; price: number; chauffeur_price: number }> },
  hireType: 'dry-hire' | 'chauffeured',
  days: number
): number {
  const tier = vehicle.day_rates?.find(r =>
    days >= r.days_from && (r.days_to === null || days <= r.days_to)
  )
  if (tier) {
    return hireType === 'dry-hire' ? tier.price : tier.chauffeur_price
  }
  return hireType === 'dry-hire' ? vehicle.price : vehicle.chauffeur_price
}
