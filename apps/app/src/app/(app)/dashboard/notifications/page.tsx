"use client"

import { NotificationFeed } from "../_components/notification-feed"

export default function NotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Notification Feed</h1>
      <NotificationFeed showHeader={false} />
    </div>
  )
}


