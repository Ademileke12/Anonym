"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@/components/wallet/connect-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { AnonymLogo } from "@/components/brand/logo";
import {
  Menu,
  Bell,
  X,
  LayoutDashboard,
  Send,
  Download,
  HeartHandshake,
  Plus,
  Eye,
  Settings,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";

export function AppTopbar() {
  const { configured, user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const unread = useUnreadNotifications();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-base/90 px-3 backdrop-blur-md sm:px-4"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-subtle md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu className="size-5" />
        </button>
        {configured ? (
          <Badge variant="green" className="hidden sm:inline-flex" dot>
            Live
          </Badge>
        ) : (
          <Badge variant="yellow" className="hidden sm:inline-flex">
            Setup required
          </Badge>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Link
          href="/app/notifications"
          className="relative inline-flex size-10 items-center justify-center rounded-full border border-line bg-card text-muted hover:text-ink sm:size-9"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-inverse text-[9px] font-bold text-on-inverse">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>
        <ThemeToggle compact />
        <ConnectButton size="sm" compact />
      </div>

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      {/* Slide-out nav panel */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-[100dvh] w-64 overflow-y-auto bg-card shadow-xl transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <AnonymLogo size={24} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-subtle"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-2">
          {[
            { href: "/app", label: "Dashboard", icon: LayoutDashboard },
            { href: "/app/transfer", label: "Send", icon: Send },
            { href: "/app/receive", label: "Receive", icon: Download },
            { href: "/app/campaigns", label: "Campaigns", icon: HeartHandshake },
            { href: "/app/campaigns/new", label: "Create campaign", icon: Plus },
            { href: "/app/backdoor", label: "Backdoor", icon: Eye },
            { href: "/app/notifications", label: "Notifications", icon: Bell },
            { href: "/app/settings", label: "Settings", icon: Settings },
          ].map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                  active
                    ? "bg-subtle font-medium text-ink"
                    : "text-muted hover:bg-subtle hover:text-ink",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {user && (
          <div className="border-t border-line p-3">
            <Link
              href={`/anonym/@${user.username}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-subtle hover:text-ink"
            >
              <UserRound className="size-4 shrink-0" />
              <span>Public profile</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
