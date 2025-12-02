import { BookingsMetrics } from "@/components/analytics/BookingsMetrics"
import { BookingsBarChart } from "@/components/analytics/BookingsBarChart"

export default function BookingsPage() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-3">Bookings</h1>
      <div className="mb-3">
        <BookingsMetrics />
      </div>
      <BookingsBarChart />
    </div>
  )
}


