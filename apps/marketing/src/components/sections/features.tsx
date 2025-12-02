import Features from "@/components/features-horizontal";
import Section from "@/components/section";
import { BarChart3, Brain, FileText, LineChart, CalendarClock } from "lucide-react";

const data = [
  {
    id: 1,
    title: "Save Time",
    content: "Create bookings, invoices & contracts at a fraction of the time.",
    image: "/createcustomerlight.png",
    icon: <CalendarClock className="h-6 w-6 text-black" />,
  },
  {
    id: 2,
    title: "Centralised Platform",
    content: "Stay in control by using only one tool to manage everything.",
    image: "/dashboardlight.png",
    icon: <Brain className="h-6 w-6 text-black" />,
  },
  {
    id: 3,
    title: "Data-Driven Insights",
    content: "Advanced performance insights with reporting analytics.",
    image: "/bookingsfulllight.png",
    icon: <LineChart className="h-6 w-6 text-black" />,
  },
  {
    id: 4,
    title: "Notification Feed",
    content: "Never lose track of dates with our notification feed.",
    image: "/notificationfeedlight.png",
    icon: <FileText className="h-6 w-6 text-black" />,
  },
];

export default function Component() {
  return (
    <Section>
      <div className="text-center space-y-4 pb-6 mx-auto">
        <span className="inline-block px-2 py-0.5 rounded bg-[#fcf400] text-black text-xs font-semibold tracking-wider uppercase">
          Features
        </span>
        <h3 className="mx-auto mt-4 max-w-5xl text-3xl font-semibold sm:text-4xl md:text-5xl">
          Why would I use IndieSuite?
        </h3>
      </div>
      <Features collapseDelay={5000} linePosition="bottom" data={data} />
    </Section>
  );
}
