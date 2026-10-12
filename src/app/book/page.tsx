import { getTaxiBookingConfig } from '@/lib/taxi-booking'
import BookPicker from './BookPicker'

export const revalidate = 0

export default async function BookPage() {
  return <BookPicker taxiConfig={await getTaxiBookingConfig()} />
}
