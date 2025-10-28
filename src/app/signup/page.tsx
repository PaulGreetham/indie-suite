import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import { Suspense } from "react"

import { SignupForm } from "@/components/signup-form"

export default function SignupPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="https://www.indiesuite.app/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="underline underline-offset-4">Back to IndieSuite</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
              <SignupForm />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="relative hidden lg:flex items-center justify-center bg-[#FCF400]">
        <Image
          src="/assets/indiesuitelogolong.svg"
          alt="IndieSuite logo"
          width={480}
          height={140}
          priority
          className="h-auto w-64 md:w-80 lg:w-[28rem]"
        />
      </div>
    </div>
  )
}


