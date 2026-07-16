"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  Download,
  HeartHandshake,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { href: "/app", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/app/transfer", label: "Send", icon: Send },
  { href: "/app/campaigns", label: "Raise", icon: HeartHandshake },
  { href: "/app/receive", label: "Receive", icon: Download },
  { href: "/app/settings", label: "More", icon: Settings },
];

/**
 * Primary navigation for phones - fixed bottom tab bar with safe-area inset.
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch justify-between px-1">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : tab.href === "/app/campaigns"
              ? pathname === "/app/campaigns" ||
                (pathname.startsWith("/app/campaigns/") &&
                  !pathname.startsWith("/app/campaigns/new"))
              : pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <li key={tab.href} className="flex min-w-0 flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                  active ? "text-ink" : "text-faint hover:text-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-xl transition-colors",
                    active && "bg-subtle text-ink",
                  )}
                >
                  <tab.icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} />
                </span>
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
