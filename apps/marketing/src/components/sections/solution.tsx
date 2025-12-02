"use client";

import FlickeringGrid from "@/components/magicui/flickering-grid";
import Ripple from "@/components/magicui/ripple";
import Safari from "@/components/safari";
import Section from "@/components/section";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const features = [
  {
    title: "Customer Relationship Management",
    description:
      "Our detailed CRM system helps you manage your clients, their detials and booking history - never lose track of your clients again.",
    className: "hover:bg-[#fcf400]/30 transition-all duration-500 ease-out",
    content: (
      <>
        <Safari
          src={`/allcustomerslight.png`}
          url="https://acme.ai"
          objectPosition="left"
          className="-mb-32 mt-4 max-h-64 w-full px-4 select-none drop-shadow-[0_0_28px_rgba(0,0,0,.1)] group-hover:translate-y-[-10px] transition-all duration-300"
        />
      </>
    ),
    highlight: true,
  },
  {
    title: "Venue Management",
    description:
      "Create as many venues as you want - IndieSuite will help you manage them all as well as showing their location on our interactive map.",
    className:
      "order-3 xl:order-none hover:bg-[#fcf400]/30 transition-all duration-500 ease-out",
    content: (
      <Safari
        src={`/allvenueslight.png`}
        url="https://acme.ai"
        objectPosition="left"
        className="-mb-32 mt-4 max-h-64 w-full px-4 select-none drop-shadow-[0_0_28px_rgba(0,0,0,.1)] group-hover:translate-y-[-10px] transition-all duration-300"
      />
    ),
    highlight: true,
  },
  {
    title: "Easy Access Dashboard",
    description:
      "Access your customers, venues, events, invoices and contracts all in one place - no more switching between different apps.",
    className:
      "md:row-span-2 hover:bg-[#fcf400]/30 transition-all duration-500 ease-out",
    content: (
      <>
        <FlickeringGrid
          className="z-0 absolute inset-0 [mask:radial-gradient(circle_at_center,#fff_400px,transparent_0)]"
          squareSize={4}
          gridGap={6}
          color="#000"
          maxOpacity={0.1}
          flickerChance={0.1}
          height={800}
          width={800}
        />
        <Safari
          src={`/dashboardlight.png`}
          url="https://acme.ai"
          objectPosition="left"
          className="-mb-48 ml-12 mt-16 h-full px-4 select-none drop-shadow-[0_0_28px_rgba(0,0,0,.1)] group-hover:translate-x-[-10px] transition-all duration-300"
        />
      </>
    ),
    highlight: true,
  },
  {
    title: "Advanced Analytics",
    description:
      "Get insights into your bookings, revenues, and more - all with beautifully animated charts, graphs and metrics. Perfect for making data-driven decisions.",
    className:
      "flex-row order-4 md:col-span-2 md:flex-row xl:order-none hover:bg-[#fcf400]/30 transition-all duration-500 ease-out",
    content: (
      <>
        <Ripple className="absolute -bottom-full" />
        <Safari
          src={`/bookingslight.png`}
          url="https://acme.ai"
          objectPosition="left"
          className="-mb-32 mt-8 max-h-64 w-full px-4 select-none drop-shadow-[0_0_28px_rgba(0,0,0,.1)] group-hover:translate-y-[-10px] transition-all duration-300"
        />
      </>
    ),
    highlight: true,
  },
];

export default function Component() {
  return (
    <Section className="bg-neutral-100 dark:bg-neutral-900">
      <div className="text-center space-y-4 pb-6 mx-auto">
        <span className="inline-block px-2 py-0.5 rounded bg-[#fcf400] text-black text-xs font-semibold tracking-wider uppercase">
          Solution
        </span>
        <h3 className="mx-auto mt-4 max-w-4xl text-3xl font-semibold sm:text-4xl md:text-5xl">
          One Platform to Manage Everything
        </h3>
        <p className="mx-auto max-w-3xl text-muted-foreground text-lg">
          IndieSuite is purpose-built for creatives to centralise bookings, clients, invoices & contracts - all in one place.
        </p>
      </div>
      <div className="mx-auto mt-16 grid max-w-sm grid-cols-1 gap-6 text-gray-500 md:max-w-3xl md:grid-cols-2 xl:grid-rows-2 md:grid-rows-3 xl:max-w-6xl xl:auto-rows-fr xl:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className={cn(
              "group relative items-start overflow-hidden bg-neutral-50 dark:bg-neutral-800 p-6 rounded-2xl",
              feature.className
            )}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: index * 0.1,
            }}
            viewport={{ once: true }}
          >
            <div>
              {feature?.highlight ? (
                <h3 className="mb-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-[#fcf400] text-black text-sm font-semibold">
                    {feature.title}
                  </span>
                </h3>
              ) : (
                <h3 className="font-semibold mb-2 text-primary">{feature.title}</h3>
              )}
              <p className="text-foreground">{feature.description}</p>
            </div>
            {feature.content}
            <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-neutral-50 dark:from-neutral-900 pointer-events-none"></div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
