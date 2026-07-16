import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type IconTileProps = {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/**
 * Neutral monochrome icon container for app surfaces (dashboard, receive, etc.).
 * No chip colors — uses border-line / subtle / muted tokens only.
 */
export function IconTile({
  icon: Icon,
  className,
  size = "md",
}: IconTileProps) {
  const box =
    size === "sm"
      ? "size-8 rounded-lg"
      : size === "lg"
        ? "size-12 rounded-2xl"
        : "size-9 rounded-xl";
  const glyph = size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-line bg-subtle text-muted",
        box,
        className,
      )}
    >
      <Icon className={glyph} strokeWidth={1.75} />
    </span>
  );
}
