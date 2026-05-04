import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you are looking for does not exist or may have moved.
      </p>
      <Link className="text-sm font-medium underline underline-offset-4" href="/dashboard/overview">
        Go to dashboard
      </Link>
    </main>
  )
}
