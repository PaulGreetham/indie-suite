"use client"

import { NotificationFeed } from "@/components/NotificationFeed"

export default function NotificationsPage() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold">Notification Feed</h1>
      <NotificationFeed showHeader={false} />
    </div>
  )
}


