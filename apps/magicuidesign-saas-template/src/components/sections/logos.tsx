import Marquee from "@/components/magicui/marquee";
import Image from "next/image";

type Persona = {
  src: string;
  alt: string;
  label: string;
};

// Replace/extend this list with real persona graphics as you add them
const personas: Persona[] = [
  { src: "/photographer.svg", alt: "Photographer", label: "Photographers" },
  { src: "/Mic drop-pana.svg", alt: "Comedians", label: "Comedians" },
  { src: "/DJ%20party-cuate.svg", alt: "DJs", label: "DJs" },
  { src: "/Rock%20band-cuate.svg", alt: "Bands", label: "Bands" },
  { src: "/Choreographer-cuate.svg", alt: "Choreographers", label: "Choreographers" },
  { src: "/tattoo%20artist-cuate.svg", alt: "Tattoo Artists", label: "Tattoo Artists" },
  { src: "/disabled musician-cuate.svg", alt: "Musicians", label: "Musicians" },
  { src: "/Making%20art-cuate.svg", alt: "Artists & Studios", label: "Artists & Studios" },
  { src: "/Recording a movie-cuate.svg", alt: "Film Crew", label: "Film Crew" },
  { src: "/Brainstorming-cuate.svg", alt: "Digital Creators", label: "Digital Creators" },
  { src: "/Makeup artist-cuate.svg", alt: "Makeup Artists", label: "Makeup Artists" },
  { src: "/Creative writing-cuate.svg", alt: "Writers & Copywriters", label: "Writers & Copywriters" },
  { src: "/Creation process-cuate.svg", alt: "Videographers", label: "Videographers" },
  { src: "/Frozen figure-cuate.svg", alt: "Freelance Artists", label: "Freelance Artists" },
  { src: "/cabaret-cuate.svg", alt: "Theatre Performers", label: "Theatre Performers" },
];

export default function Logos() {
  return (
    <section id="audiences">
      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="text-center space-y-3">
          <span className="inline-block px-2 py-0.5 rounded bg-[#fcf400] text-black text-xs font-semibold tracking-wider uppercase">
            Who is it for?
          </span>
          <h3 className="text-2xl md:text-3xl font-semibold">
            IndieSuite is built for creative freelancers
          </h3>
        </div>
        <div className="relative mt-8">
          <Marquee className="max-w-full [--duration:36s]">
            {personas.map((item, idx) => (
              <div
                key={`${item.alt}-${idx}`}
                className="mx-8 flex w-64 flex-col items-center justify-center p-2"
              >
                <Image
                  width={256}
                  height={192}
                  src={item.src}
                  alt={item.alt}
                  className="h-52 w-auto"
                />
                <p className="mt-4 text-sm font-medium text-foreground">
                  {item.label}
                </p>
              </div>
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-1/3 bg-gradient-to-r from-background"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/3 bg-gradient-to-l from-background"></div>
        </div>
      </div>
    </section>
  );
}
