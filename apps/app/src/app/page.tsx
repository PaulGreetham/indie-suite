import { redirect } from "next/navigation"

export default function Home() {
  // App root should not be a marketing page. Send users to login.
  redirect("/login")
}
