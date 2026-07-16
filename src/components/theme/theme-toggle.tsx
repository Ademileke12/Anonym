"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

type ThemeToggleProps = {
  className?: string;
  /** Compact icon-only that flips light ↔ dark */
  compact?: boolean;
};

/** Theme control - compact toggle or full light/dark/system segment. */
export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { theme, setTheme, toggle, resolved } = useTheme();

  if (compact) {
    const isDark = resolved === "dark";
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink shadow-[var(--shadow-xs)] transition-colors hover:bg-subtle",
          className,
        )}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Sun className="size-4" aria-hidden />
        ) : (
          <Moon className="size-4" aria-hidden />
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-line bg-subtle p-0.5",
        className,
      )}
      role="group"
      aria-label="Color theme"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all",
              active
                ? "bg-card text-ink shadow-[var(--shadow-xs)]"
                : "text-muted hover:text-ink",
            )}
            aria-pressed={active}
            title={label}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
