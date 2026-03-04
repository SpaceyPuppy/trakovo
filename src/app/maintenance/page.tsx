import { getSiteName } from '@/lib/site'
import MaintenanceForm from './MaintenanceForm'

export default async function MaintenancePage() {
  const siteName = await getSiteName()
  return <MaintenanceForm siteName={siteName} />
}
