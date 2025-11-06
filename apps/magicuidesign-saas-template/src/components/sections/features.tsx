import Features from "@/components/features-horizontal";
import Section from "@/components/section";
import { BarChart3, Brain, FileText, LineChart } from "lucide-react";

const data = [
  {
    id: 1,
    title: "AI-Powered Dashboard",
    content: "Visualize trends and gain insights at a glance.",
    image: "/dashboardlight.png",
    icon: <BarChart3 className="h-6 w-6 text-black" />,
  },
  {
    id: 2,
    title: "Natural Language Processing",
    content: "Analyze text and extract sentiment effortlessly.",
    image: "/dashboardlight.png",
    icon: <Brain className="h-6 w-6 text-black" />,
  },
  {
    id: 3,
    title: "Predictive Analytics",
    content: "Forecast trends and make data-driven decisions.",
    image: "/dashboardlight.png",
    icon: <LineChart className="h-6 w-6 text-black" />,
  },
  {
    id: 4,
    title: "Automated Reporting",
    content: "Generate comprehensive reports with one click.",
    image: "/dashboardlight.png",
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
          User Flows and Navigational Structures
        </h3>
      </div>
      <Features collapseDelay={5000} linePosition="bottom" data={data} />
    </Section>
  );
}
