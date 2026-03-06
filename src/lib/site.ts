import { queryOne } from './db'

export async function getSiteName(): Promise<string> {
  try {
    const row = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['site_name'])
    if (row?.value) return row.value
  } catch { /* DB not ready */ }
  return process.env.NEXT_PUBLIC_SITE_NAME ?? 'Trakovo'
}

export async function getAdminName(): Promise<string> {
  try {
    const row = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['admin_name'])
    if (row?.value) return row.value
  } catch { /* DB not ready */ }
  return process.env.NEXT_PUBLIC_ADMIN_NAME ?? 'Hire Manager'
}

export async function getDriverName(): Promise<string> {
  try {
    const row = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['driver_name'])
    if (row?.value) return row.value
  } catch { /* DB not ready */ }
  return 'DriveMaster'
}
