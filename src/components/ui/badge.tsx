import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        muted: "bg-muted-bg text-muted",
        outline: "border border-line text-ink",
        inverse: "bg-inverse text-on-inverse",
        green: "bg-chip-green-bg text-chip-green-fg",
        blue: "bg-chip-blue-bg text-chip-blue-fg",
        yellow: "bg-chip-yellow-bg text-chip-yellow-fg",
        orange: "bg-chip-orange-bg text-chip-orange-fg",
        red: "bg-chip-red-bg text-chip-red-fg",
        purple: "bg-chip-purple-bg text-chip-purple-fg",
        gray: "bg-chip-gray-bg text-chip-gray-fg",
      },
    },
    defaultVariants: { variant: "muted" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props}>
      {dot ? (
        <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}
