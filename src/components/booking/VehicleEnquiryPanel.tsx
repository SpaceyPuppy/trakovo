import OccasionEnquiryForm from '@/app/special-occasions/OccasionEnquiryForm'
import type { Vehicle } from '@/types'

export default function VehicleEnquiryPanel({ vehicle }: { vehicle: Vehicle }) {
  return <section id="enquiry" aria-label="Vehicle enquiry" className="scroll-mt-20 min-w-0">
    <h2 className="font-display font-bold text-[22px] mb-2">Enquire about this vehicle</h2>
    <p className="text-[14px] text-ink-3 leading-relaxed mb-5">Tell us about your occasion and plans for {vehicle.name}. Our team will discuss availability and prepare a personalised quote.</p>
    <OccasionEnquiryForm key={vehicle.id} vehicles={[{ id: vehicle.id, name: vehicle.name }]} initialVehicleId={vehicle.id} />
  </section>
}
