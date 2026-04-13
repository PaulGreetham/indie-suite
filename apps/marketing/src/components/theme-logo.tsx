"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type ThemeLogoProps = {
  className?: string;
  imageClassName?: string;
  alt?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

export function ThemeLogo({
  className,
  imageClassName,
  alt = "IndieSuite",
  width = 140,
  height = 22,
  priority = false,
}: ThemeLogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/lightlonglogo.svg"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("dark:hidden", imageClassName)}
      />
      <Image
        src="/darklonglogo.svg"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("hidden dark:block", imageClassName)}
      />
    </span>
  );
}
