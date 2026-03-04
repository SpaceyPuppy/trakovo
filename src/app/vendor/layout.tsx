import { getVendorSession } from '@/lib/vendor-auth'
import { getAdminName } from '@/lib/site'
import VendorNav from './VendorNav'

// Auth is enforced by middleware for all /vendor/* except /vendor/login.
// The layout must NOT redirect — that causes a 307 loop on the login page
// because the layout also wraps /vendor/login.

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const session = await getVendorSession()

  // No session = this is the login page (middleware blocks everything else).
  // Render children bare without the nav chrome.
  if (!session) {
    return <div className="min-h-screen bg-[#f0efe9]">{children}</div>
  }

  const portalName = await getAdminName()

  return (
    <div className="min-h-screen bg-[#f0efe9]">
      <VendorNav vendorName={session.vendorName} portalName={portalName} />
      <main className="px-4 sm:px-8 md:px-10 py-8 md:py-10 max-w-[1400px]">
        {children}
      </main>
    </div>
  )
}
