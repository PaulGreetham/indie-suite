"use client";

import Marquee from "@/components/magicui/marquee";
import Section from "@/components/section";
import { marketingTestimonials } from "@/components/sections/testimonials-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

export interface TestimonialCardProps {
  name: string;
  role: string;
  quote: string;
  className?: string;
  [key: string]: any;
}

export const TestimonialCard = ({
  quote,
  name,
  role,
  className,
  ...props // Capture the rest of the props
}: TestimonialCardProps) => (
  <div
    className={cn(
      "mb-4 flex w-full cursor-pointer break-inside-avoid flex-col items-center justify-between gap-6 rounded-xl p-4",
      // light styles
      " border border-neutral-200 bg-white",
      // dark styles
      "dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      className
    )}
    {...props} // Spread the rest of the props here
  >
    <div className="select-none text-sm font-normal text-neutral-700 dark:text-neutral-400">
      <p>{quote}</p>
      <div className="flex flex-row py-1">
        <Star className="size-4 text-[#fcf400] fill-[#fcf400]" />
        <Star className="size-4 text-[#fcf400] fill-[#fcf400]" />
        <Star className="size-4 text-[#fcf400] fill-[#fcf400]" />
        <Star className="size-4 text-[#fcf400] fill-[#fcf400]" />
        <Star className="size-4 text-[#fcf400] fill-[#fcf400]" />
      </div>
    </div>

    <div className="flex w-full select-none items-center justify-start">
      <div>
        <p className="font-medium text-neutral-500">{name}</p>
        <p className="text-xs font-normal text-neutral-400">{role}</p>
      </div>
    </div>
  </div>
);

export default function Testimonials() {
  return (
    <Section className="max-w-8xl">
      <div className="text-center space-y-4 pb-6 mx-auto">
        <span className="inline-block px-2 py-0.5 rounded bg-[#fcf400] text-black text-xs font-semibold tracking-wider uppercase">
          Testimonials
        </span>
        <h3 className="mx-auto mt-4 max-w-4xl text-3xl font-semibold sm:text-4xl md:text-5xl">
          What our customers are saying
        </h3>
      </div>
      <div className="relative mt-6 max-h-screen overflow-hidden">
        <div className="gap-4 md:columns-2 xl:columns-3 2xl:columns-4">
          {Array(Math.ceil(marketingTestimonials.length / 3))
            .fill(0)
            .map((_, i) => (
              <Marquee
                vertical
                key={i}
                className={cn({
                  "[--duration:60s]": i === 1,
                  "[--duration:30s]": i === 2,
                  "[--duration:70s]": i === 3,
                })}
              >
                {marketingTestimonials
                  .slice(i * 3, (i + 1) * 3)
                  .map((card) => (
                    <motion.div
                      key={card.name}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        delay: Math.random() * 0.8,
                        duration: 1.2,
                      }}
                    >
                      <TestimonialCard {...card} />
                    </motion.div>
                  ))}
              </Marquee>
            ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 w-full bg-gradient-to-t from-background from-20%"></div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 w-full bg-gradient-to-b from-background from-20%"></div>
      </div>
    </Section>
  );
}
