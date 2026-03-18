export interface Clause {
  title: string
  body: string
}

export const DEFAULT_HIRE_AGREEMENT: Clause[] = [
  { title: '1. Hirer Requirements', body: "The Hirer must hold a current and valid Australian driver's licence appropriate for the class of vehicle. The Hirer must be at least 21 years of age and present valid photo ID at the time of vehicle collection." },
  { title: '2. Authorised Drivers', body: 'The vehicle may only be driven by the nominated Hirer. Any additional drivers must be declared in advance and approved in writing by the operator.' },
  { title: '3. Permitted Use', body: 'The vehicle must not be used for any unlawful purpose, racing, off-road driving, driver instruction, or to carry more passengers than the vehicle is rated for.' },
  { title: '4. Damage & Excess', body: 'The Hirer is responsible for all damage occurring during the hire period. A damage excess of $2,500 applies per incident.' },
  { title: '5. Fuel', body: 'Vehicles are provided with a full tank and must be returned full. A refuelling fee of $2.50/L plus a $40 admin fee applies if returned below full.' },
  { title: '6. Late Returns', body: 'The vehicle must be returned by the agreed date and time. Late returns are charged at the full daily rate per day or part thereof.' },
  { title: '7. Cancellation', body: 'Cancellations more than 48 hours prior to hire start receive a full refund. Cancellations within 48 hours forfeit the deposit.' },
]

export function parseHireAgreement(raw: string | null | undefined): Clause[] {
  if (!raw) return DEFAULT_HIRE_AGREEMENT
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch { /* fall through */ }
  return DEFAULT_HIRE_AGREEMENT
}
