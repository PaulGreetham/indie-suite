import Link from "next/link";
import { redirect } from "next/navigation";

export default function SignupRedirect() {
  const base = process.env.NEXT_PUBLIC_MAIN_APP_URL;
  if (!base) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Missing NEXT_PUBLIC_MAIN_APP_URL. Please configure the marketing site to point to your main app.
        </p>
        <p className="mt-2">
          <Link href="/" className="underline">
            Go back
          </Link>
        </p>
      </div>
    );
  }
  redirect(`${base}/signup`);
}
