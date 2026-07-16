import * as React from "react";
import { cn } from "@/lib/utils";

/** Centered max-width container (~1120px) matching Attio marketing width. */
export function Container({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1120px] px-4 sm:px-6",
        className,
      )}
      {...props}
    />
  );
}

type SectionProps = React.HTMLAttributes<HTMLElement> & {
  tone?: "white" | "subtle" | "inverse";
};

export function Section({
  className,
  tone = "white",
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "py-14 sm:py-20 md:py-28",
        tone === "white" && "bg-base text-ink",
        tone === "subtle" && "bg-subtle text-ink",
        tone === "inverse" && "bg-inverse text-on-inverse",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
