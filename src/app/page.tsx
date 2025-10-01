import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">Build your B2B SaaS faster</h1>
        <p className="text-muted-foreground mt-3">Next.js, TypeScript, Tailwind and shadcn/ui starter.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/login">Start now</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">View dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
