"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const HEX = "0123456789abcdef";
const GLYPHS = "◆◇○●▣▢░▒▓█※✦·";

function seededChar(seed: number, pool: string) {
  return pool[Math.abs(seed * 2654435761) % pool.length];
}

function makeCells(side: "left" | "right", cols: number, rows: number) {
  const cells: {
    id: string;
    col: number;
    row: number;
    glyph: string;
    delay: number;
    duration: number;
    tone: "hex" | "block" | "dot";
  }[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const seed =
        (side === "left" ? 1 : 7) * 1000 + row * 31 + col * 17;
      const tone =
        seed % 5 === 0 ? "block" : seed % 3 === 0 ? "dot" : "hex";
      cells.push({
        id: `${side}-${row}-${col}`,
        col,
        row,
        glyph:
          tone === "hex"
            ? `${seededChar(seed, HEX)}${seededChar(seed + 3, HEX)}`
            : tone === "block"
              ? seededChar(seed, GLYPHS)
              : "·",
        delay: ((row + col) % 8) * 0.12 + (side === "right" ? 0.2 : 0),
        duration: 2.4 + ((row * col) % 5) * 0.35,
        tone,
      });
    }
  }
  return cells;
}

function Brick({
  glyph,
  delay,
  duration,
  tone,
}: {
  glyph: string;
  delay: number;
  duration: number;
  tone: "hex" | "block" | "dot";
}) {
  const [hot, setHot] = useState(false);
  const [scrambled, setScrambled] = useState(glyph);

  function scramble() {
    setHot(true);
    const ticks = 6;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setScrambled(
        tone === "hex"
          ? `${seededChar(Date.now() + i, HEX)}${seededChar(Date.now() + i * 2, HEX)}`
          : seededChar(Date.now() + i, GLYPHS),
      );
      if (i >= ticks) {
        window.clearInterval(id);
        setScrambled(glyph);
        window.setTimeout(() => setHot(false), 180);
      }
    }, 40);
  }

  return (
    <motion.button
      type="button"
      onMouseEnter={scramble}
      onFocus={scramble}
      className={cn(
        "group relative flex aspect-square items-center justify-center rounded-[6px] border text-[10px] font-mono leading-none transition-colors sm:text-[11px]",
        "border-line bg-card/40 text-ink/25 backdrop-blur-[1px]",
        "hover:border-ink/20 hover:bg-card hover:text-ink hover:shadow-[var(--shadow-card)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        hot && "border-ink/25 bg-card text-ink shadow-[var(--shadow-card)]",
        tone === "dot" && "text-ink/15",
      )}
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{
        opacity: [0.35, 0.85, 0.5, 0.9, 0.4],
        y: [0, -2, 1, 0],
      }}
      transition={{
        opacity: {
          duration,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        },
        y: {
          duration: duration * 1.2,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        },
        scale: { duration: 0.4, delay },
      }}
      whileHover={{ scale: 1.08, zIndex: 2 }}
      whileTap={{ scale: 0.96 }}
      aria-label="Encrypted cell"
    >
      <span className="select-none tabular-nums">{scrambled}</span>
      {/* decrypt flash */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[6px] bg-gradient-to-br from-chip-blue-bg/0 to-chip-purple-bg/0 transition-opacity",
          hot && "from-chip-blue-bg/50 to-chip-purple-bg/40 opacity-100",
        )}
      />
    </motion.button>
  );
}

type EncryptedBricksProps = {
  side: "left" | "right";
  className?: string;
};

/** Grid of animated “encrypted” bricks for hero flanks. */
export function EncryptedBricks({ side, className }: EncryptedBricksProps) {
  const cells = useMemo(() => makeCells(side, 5, 12), [side]);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-0 bottom-0 hidden w-[min(22vw,220px)] select-none lg:block",
        side === "left" ? "left-0 pl-3" : "right-0 pr-3",
        className,
      )}
      aria-hidden={false}
    >
      <div
        className={cn(
          "absolute inset-y-8 grid grid-cols-5 content-start gap-1.5",
          side === "left" ? "left-3 right-2" : "left-2 right-3",
        )}
        style={{
          maskImage:
            side === "left"
              ? "linear-gradient(to right, black 40%, transparent 100%)"
              : "linear-gradient(to left, black 40%, transparent 100%)",
          WebkitMaskImage:
            side === "left"
              ? "linear-gradient(to right, black 40%, transparent 100%)"
              : "linear-gradient(to left, black 40%, transparent 100%)",
        }}
      >
        {cells.map((cell) => (
          <Brick
            key={cell.id}
            glyph={cell.glyph}
            delay={cell.delay}
            duration={cell.duration}
            tone={cell.tone}
          />
        ))}
      </div>
    </div>
  );
}
