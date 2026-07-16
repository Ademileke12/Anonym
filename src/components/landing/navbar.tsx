"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/section";
import { AnonymLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/providers/auth-provider";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "#problem", label: "Why privacy" },
  { href: "#walkthrough", label: "How it works" },
  { href: "#transfer-flow", label: "Transfers" },
  { href: "#campaign-flow", label: "Fundraising" },
  { href: "#backdoor", label: "Backdoor" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNavbar() {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const ctaHref = isAuthenticated
    ? user
      ? "/app"
      : "/app/onboarding"
    : "/app";
  const ctaLabel = isAuthenticated
    ? user
      ? "Open app"
      : "Continue setup"
    : "Launch app";

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-base/80 backdrop-blur-xl">
      <Container className="flex h-14 items-center justify-between gap-3 sm:h-16">
        <div className="flex min-w-0 items-center gap-6 lg:gap-8">
          <Link href="/" className="flex shrink-0 items-center">
            <AnonymLogo size={28} />
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-muted lg:flex xl:gap-6">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle compact />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl text-muted hover:bg-subtle lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </Container>

      {/* Mobile sheet */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-[var(--overlay)] transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex w-full flex-col border-r border-line bg-card shadow-[var(--shadow-elevated)] transition-transform duration-200 ease-out sm:left-auto sm:w-[min(100vw-2.5rem,20rem)] sm:border-l sm:border-r-0",
            open ? "translate-x-0" : "-translate-x-full sm:translate-x-full",
          )}
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex h-14 items-center justify-between border-b border-line px-4">
            <AnonymLogo size={24} />
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-xl text-muted hover:bg-subtle"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-subtle hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div
            className="border-t border-line p-4"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <Button asChild className="w-full" size="lg">
              <Link href={ctaHref} onClick={() => setOpen(false)}>
                {ctaLabel}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
