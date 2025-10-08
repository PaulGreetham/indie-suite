import { DashboardMetrics } from "@/components/analytics/DashboardMetrics"
import { BookingsChart } from "@/components/analytics/BookingsChart"

export default function RevenuePage() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-3">Revenue</h1>
      <div className="mb-3">
        <DashboardMetrics />
      </div>
      <BookingsChart className="w-full" />
    </div>
  )
}


