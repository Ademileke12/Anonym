import { cn } from "@/lib/utils";

type LogoProps = {
  /** icon-only, or mark + wordmark */
  variant?: "mark" | "full";
  /** pixel size of the mark square */
  size?: number;
  className?: string;
  /** force inverse colors (for dark surfaces) */
  inverse?: boolean;
};

/**
 * Anonym brand mark - privacy aperture.
 *
 * Concept: two overlapping discs (conceal / reveal) inside a rounded app tile,
 * with a focused core for private settlement. Not a plain letter "A".
 */
export function AnonymMark({
  size = 28,
  className,
  inverse = false,
}: {
  size?: number;
  className?: string;
  inverse?: boolean;
}) {
  // Theme-aware via CSS vars: tile = inverse surface, glyph = on-inverse.
  // `inverse` prop forces the opposite pair (for dark marketing blocks).
  const bg = inverse ? "var(--bg-base)" : "var(--bg-inverse)";
  const fg = inverse ? "var(--text-primary)" : "var(--text-on-inverse)";
  const core = inverse ? "var(--bg-base)" : "var(--bg-inverse)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Anonym"
    >
      <title>Anonym</title>
      {/* App tile */}
      <rect width="32" height="32" rx="8" fill={bg} />

      {/* Soft outer ring - private network boundary */}
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke={fg}
        strokeWidth="1.5"
        opacity="0.22"
      />

      {/* Conceal disc (solid) */}
      <circle cx="12.8" cy="16" r="5.6" fill={fg} />

      {/* Reveal disc (cutaway via overlap) - lighter opacity */}
      <circle cx="19.2" cy="16" r="5.6" fill={fg} opacity="0.32" />

      {/* Intersection emphasis - private link node */}
      <circle cx="16" cy="16" r="2.35" fill={core} />
      <circle cx="16" cy="16" r="1.05" fill={fg} opacity="0.9" />

      {/* Trust arc */}
      <path
        d="M10.5 11.2C12.2 9.2 14 8.2 16 8.2C18 8.2 19.8 9.2 21.5 11.2"
        stroke={fg}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

export function AnonymLogo({
  variant = "full",
  size = 28,
  className,
  inverse = false,
}: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-semibold tracking-tight",
        inverse ? "text-on-inverse" : "text-ink",
        className,
      )}
    >
      <AnonymMark size={size} inverse={inverse} />
      {variant === "full" ? (
        <span
          className="text-[15px] leading-none"
          style={{ letterSpacing: "-0.02em" }}
        >
          Anonym
        </span>
      ) : null}
    </span>
  );
}
