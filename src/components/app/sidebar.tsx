"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  Download,
  HeartHandshake,
  Eye,
  Bell,
  Settings,
  UserRound,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { AnonymLogo } from "@/components/brand/logo";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";

const nav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/transfer", label: "Send", icon: Send },
  { href: "/app/receive", label: "Receive", icon: Download },
  { href: "/app/campaigns", label: "Campaigns", icon: HeartHandshake },
  { href: "/app/campaigns/new", label: "Create campaign", icon: Plus },
  { href: "/app/backdoor", label: "Backdoor", icon: Eye },
  { href: "/app/notifications", label: "Notifications", icon: Bell, badge: true },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

/**
 * Fixed left rail. Username / avatar block is always at the bottom of the screen.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const unread = useUnreadNotifications();

  return (
    <>
      {/* Spacer so main content doesn't sit under the fixed rail */}
      <div className="hidden w-60 shrink-0 md:block" aria-hidden />

      <aside
        className={cn(
          "fixed left-0 top-0 z-20 hidden h-screen w-60 flex-col border-r border-line bg-subtle/40",
          "supports-[height:100dvh]:h-dvh md:flex",
        )}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-line px-4">
          <Link href="/" className="flex items-center">
            <AnonymLogo size={26} />
          </Link>
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const isActive =
              item.href === "/app/campaigns"
                ? pathname === "/app/campaigns" ||
                  (pathname.startsWith("/app/campaigns/") &&
                    !pathname.startsWith("/app/campaigns/new"))
                : active;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-card font-medium text-ink shadow-[var(--shadow-xs)]"
                    : "text-muted hover:bg-card/70 hover:text-ink",
                )}
              >
                <item.icon className="size-4 opacity-70" />
                <span className="flex-1">{item.label}</span>
                {item.badge && unread > 0 ? (
                  <span className="min-w-5 rounded-full bg-inverse px-1.5 py-0.5 text-center text-[10px] font-semibold text-on-inverse">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
          {user ? (
            <Link
              href={`/anonym/@${user.username}`}
              className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-card/70 hover:text-ink"
            >
              <UserRound className="size-4 opacity-70" />
              Public profile
            </Link>
          ) : null}
        </nav>

        {/* Fixed to bottom of the rail — always visible at the bottom of the screen */}
        {user ? (
          <div className="mt-auto shrink-0 border-t border-line bg-subtle/90 p-3 backdrop-blur-sm">
            <Link
              href="/app/settings"
              className="flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2.5 shadow-[var(--shadow-xs)] transition-colors hover:bg-subtle"
            >
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt=""
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted-bg text-xs font-semibold">
                  {(user.display_name || user.username)
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">@{user.username}</p>
                <p className="truncate text-xs text-muted">
                  {user.display_name ?? user.account_type}
                </p>
              </div>
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}
