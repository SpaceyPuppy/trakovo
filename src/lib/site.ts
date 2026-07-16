import { cache } from 'react'
import { getSettings, type SettingsMap } from './settings'

const SITE_SETTING_KEYS = ['site_name', 'admin_name', 'vendor_name', 'driver_name', 'logo_path'] as const

const getSiteSettings = cache(async (): Promise<SettingsMap> => {
  try {
    return await getSettings(SITE_SETTING_KEYS)
  } catch {
    // DB not ready
    return {}
  }
})

export async function getSiteName(): Promise<string> {
  const settings = await getSiteSettings()
  if (settings.site_name) return settings.site_name
  return process.env.NEXT_PUBLIC_SITE_NAME ?? 'Trakovo'
}

export async function getAdminName(): Promise<string> {
  const settings = await getSiteSettings()
  if (settings.admin_name) return settings.admin_name
  return process.env.NEXT_PUBLIC_ADMIN_NAME ?? 'Hire Manager'
}

export async function getDriverName(): Promise<string> {
  const settings = await getSiteSettings()
  if (settings.driver_name) return settings.driver_name
  return 'DriveMaster'
}

export async function getVendorPortalName(): Promise<string> {
  const settings = await getSiteSettings()
  if (settings.vendor_name) return settings.vendor_name
  // Fall back to admin_name for backwards compatibility
  if (settings.admin_name) return settings.admin_name
  return process.env.NEXT_PUBLIC_ADMIN_NAME ?? 'Hire Manager'
}

export async function getLogoUrl(): Promise<string | undefined> {
  const settings = await getSiteSettings()
  if (settings.logo_path) return '/api/logo'
}
