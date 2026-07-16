import { cn } from "@/lib/utils";

type AvatarClusterProps = {
  count?: number;
  className?: string;
  size?: "sm" | "md";
};

/** Overlapping circular avatars for social proof. */
export function AvatarCluster({
  count = 4,
  className,
  size = "md",
}: AvatarClusterProps) {
  const tones = [
    "bg-[#c7d2fe]",
    "bg-[#bbf7d0]",
    "bg-[#fde68a]",
    "bg-[#fecaca]",
    "bg-[#ddd6fe]",
  ];
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <div className={cn("flex items-center", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block rounded-full border-2 border-card",
            dim,
            tones[i % tones.length],
            i > 0 && "-ml-2.5",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}
