import { getSiteName } from '@/lib/site'
import AdminLoginForm from './AdminLoginForm'

export default async function AdminLoginPage() {
  const siteName = await getSiteName()
  return <AdminLoginForm siteName={siteName} />
}
