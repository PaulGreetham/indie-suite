import { RevenueMetrics } from "@/components/analytics/RevenueMetrics"
import { RevenueChart } from "@/components/analytics/RevenueChart"

export default function RevenuePage() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-3">Revenue</h1>
      <div className="mb-3">
        <RevenueMetrics />
      </div>
      <RevenueChart className="w-full" />
    </div>
  )
}


