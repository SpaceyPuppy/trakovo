import { notFound } from 'next/navigation'
import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import VehiclePageContent from './VehiclePageContent'
import { getVehicle, getAvailability } from '@/lib/api'
import { queryOne } from '@/lib/db'
import { parseHireAgreement } from '@/lib/hire-agreement-defaults'
import type { Metadata } from 'next'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const v = await getVehicle(params.slug)
    return { title: v.name }
  } catch { return { title: 'Vehicle' } }
}

export const revalidate = 0

export default async function VehicleDetailPage({ params }: Props) {
  let vehicle, availability
  try {
    vehicle = await getVehicle(params.slug)
    availability = await getAvailability(vehicle.id).catch(() => [])
  } catch { notFound() }

  const agreementRow = await queryOne<{ value: string }>("SELECT value FROM Setting WHERE `key` = 'hire_agreement' LIMIT 1").catch(() => null)
  const hireAgreementClauses = parseHireAgreement(agreementRow?.value)

  return (
    <>
      <NavWrapper />
      <main className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-12 pb-16 md:pb-20 animate-fade-up">
        <a href="/vehicles" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-3 font-medium hover:text-ink transition-colors mb-7">← Back to Fleet</a>
        <VehiclePageContent
          vehicle={vehicle}
          availability={availability}
          hireAgreementClauses={hireAgreementClauses}
        />
      </main>
      <Footer />
    </>
  )
}
