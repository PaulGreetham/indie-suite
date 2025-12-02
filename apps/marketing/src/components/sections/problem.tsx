import BlurFade from "@/components/magicui/blur-fade";
import Section from "@/components/section";
import { Card, CardContent } from "@/components/ui/card";
import { NotepadText, MapPinCheckInside, Hourglass } from "lucide-react";

const problems = [
  {
    title: "Using too many tools",
    description:
      "Are you still using Excel, Google Sheets, Word, and other tools to manage your bookings? IndieSuite centralises this so you only need one tool to manage everything.",
    icon: NotepadText,
  },
  {
    title: "Keeping track of everything",
    description:
      "Do you ever feel like you're losing control of bookings? Emails, customers, spreadhseets, invoices, contracts (did they sign?!). IndieSuite keeps it all in one place.",
    icon: MapPinCheckInside,
  },
  {
    title: "Takes too much time",
    description:
      "Still manually entering customer and venue details for each booking? IndieSuite automates this whilst also generating invoices and contracts for each booking.",
    icon: Hourglass,
  },
];

export default function Component() {
  return (
    <Section>
      <div className="text-center space-y-4 pb-6 mx-auto">
        <span className="inline-block px-2 py-0.5 rounded bg-[#fcf400] text-black text-xs font-semibold tracking-wider uppercase">
          Problem
        </span>
        <h3 className="mx-auto mt-4 max-w-xs text-3xl font-semibold sm:max-w-none sm:text-4xl md:text-5xl">
          Too Many Tools. Too Much Chaos.
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {problems.map((problem, index) => (
          <BlurFade key={index} delay={0.2 + index * 0.2} inView>
            <Card className="bg-background border-none shadow-none">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-[#fcf400] rounded-full flex items-center justify-center">
                  <problem.icon className="w-6 h-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold">{problem.title}</h3>
                <p className="text-muted-foreground">{problem.description}</p>
              </CardContent>
            </Card>
          </BlurFade>
        ))}
      </div>
    </Section>
  );
}
