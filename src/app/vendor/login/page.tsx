import { getSiteName, getAdminName } from '@/lib/site'
import VendorLoginForm from './VendorLoginForm'

export default async function VendorLoginPage() {
  const [siteName, portalName] = await Promise.all([getSiteName(), getAdminName()])
  return <VendorLoginForm portalName={portalName} siteName={siteName} />
}
