import Features from "@/components/features-vertical";
import Section from "@/components/section";
import { CircleCheck, ChartNoAxesCombined, CalendarDays } from "lucide-react";

const data = [
  {
    id: 1,
    title: "1. Add Customer & Venue Details",
    content:
      "Simply add your customer and venue details to our platform. This will help you manage your clients and venues effectively to create bookings.",
    image: "/createcustomerlight.png",
    icon: <CircleCheck className="w-6 h-6 text-black" />,
  },
  {
    id: 2,
    title: "2. Create Event, Invoice & Contract",
    content:
      "Create an event with customer & venue data with specific terms. This then automatically generates invoices & contracts for you to send to your client.",
    image: "/calendarviewlight.png",
    icon: <CalendarDays className="w-6 h-6 text-black" />,
  },
  {
    id: 3,
    title: "3. View Advanced Analytics",
    content:
      "Get insights into your bookings, revenues, and more - all with beautifully animated charts, graphs and metrics. Perfect for making data-driven decisions.",
    image: "/revenuelight.png",
    icon: <ChartNoAxesCombined className="w-6 h-6 text-black" />,
  },
];

export default function Component() {
  return (
    <Section>
      <div className="text-center space-y-4 pb-6 mx-auto">
        <span className="inline-block px-2 py-0.5 rounded bg-[#fcf400] text-black text-xs font-semibold tracking-wider uppercase">
          How it works
        </span>
        <h3 className="mx-auto mt-4 max-w-4xl text-3xl font-semibold sm:text-4xl md:text-5xl">
          Just 3 steps to get started
        </h3>
      </div>
      <Features data={data} />
    </Section>
  );
}
