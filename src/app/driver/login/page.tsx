import { getAdminName, getSiteName } from '@/lib/site'
import DriverLoginForm from './DriverLoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'DriveMaster — Sign In' }

export default async function DriverLoginPage() {
  const [portalName, siteName] = await Promise.all([getAdminName(), getSiteName()])
  return <DriverLoginForm portalName={portalName} siteName={siteName} />
}
