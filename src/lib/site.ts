import { prisma } from './db'

export async function getSiteName(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'site_name' } })
    if (row?.value) return row.value
  } catch { /* DB not ready */ }
  return process.env.NEXT_PUBLIC_SITE_NAME ?? 'Trakovo'
}

export async function getAdminName(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'admin_name' } })
    if (row?.value) return row.value
  } catch { /* DB not ready */ }
  return process.env.NEXT_PUBLIC_ADMIN_NAME ?? 'Hire Manager'
}
