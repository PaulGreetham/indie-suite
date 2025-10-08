import { BookingsChart } from "@/components/analytics/BookingsChart"
import { DashboardMetrics } from "@/components/analytics/DashboardMetrics"

export default function DashboardAnalyticsPage() {
  return (
    <>
      <div className="p-1">
        <h1 className="text-2xl font-semibold mb-4">Analytics</h1>
        <div className="mb-3">
          <DashboardMetrics />
        </div>
        <BookingsChart className="w-full" />
      </div>
    </>
  )
}


