import { getDriverSession } from '@/lib/driver-auth'
import { getDriverName } from '@/lib/site'
import DriverNav from './DriverNav'

// Auth is enforced by middleware for all /driver/* except /driver/login.
// The layout must NOT redirect — that causes a 307 loop on the login page.

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const session = await getDriverSession()

  if (!session) {
    return <div className="min-h-screen bg-[#f0efe9]">{children}</div>
  }

  const portalName = await getDriverName()

  return (
    <div className="min-h-screen bg-[#f0efe9]">
      <DriverNav driverName={session.driverName} portalName={portalName} />
      <main className="px-4 sm:px-8 md:px-10 py-8 md:py-10 max-w-[1400px]">
        {children}
      </main>
    </div>
  )
}
