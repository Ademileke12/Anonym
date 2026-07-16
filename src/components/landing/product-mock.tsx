"use client";

import { Badge } from "@/components/ui/badge";
import { AnonymLogo } from "@/components/brand/logo";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Inbox,
  Search,
  Shield,
  Wallet,
} from "lucide-react";

const activity = [
  {
    title: "Protected receive 25 MON",
    sub: "Ready to claim · vault",
    out: false,
  },
  {
    title: "Contributed 10 MON",
    sub: "Campaign vault · anonymous",
    out: true,
  },
  {
    title: "Protected send 15 MON",
    sub: "To @bob · deposited",
    out: true,
  },
  {
    title: "Campaign received 40 MON",
    sub: "Vault balance updated",
    out: false,
  },
];

const stats = [
  { label: "Balance", value: "128.4", hint: "MON · wallet" },
  { label: "Claimable", value: "35", hint: "2 transfers" },
  { label: "Raised", value: "2.1k", hint: "1 campaign" },
  { label: "Sent", value: "120", hint: "Vault deposits" },
];

/**
 * Hero product mock - mirrors the real Protected Activity dashboard.
 */
export function ProductMock() {
  return (
    <div className="relative mx-auto w-full">
      <div className="overflow-hidden rounded-xl border border-line bg-card shadow-[var(--shadow-float)] sm:rounded-2xl">
        <div className="flex min-h-[320px] sm:min-h-[420px]">
          {/* Sidebar */}
          <aside className="hidden w-48 shrink-0 border-r border-line bg-subtle/60 p-3 sm:block">
            <div className="mb-4 flex items-center px-2 py-1.5">
              <AnonymLogo size={22} />
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
              <div className="h-8 rounded-lg border border-line bg-card pl-8 text-xs leading-8 text-faint">
                Search
              </div>
            </div>
            <nav className="space-y-0.5 text-[13px] text-muted">
              {[
                "Dashboard",
                "Send",
                "Receive",
                "Campaigns",
                "Backdoor",
                "Settings",
              ].map((item, i) => (
                <div
                  key={item}
                  className={`rounded-lg px-2.5 py-1.5 ${
                    i === 0
                      ? "bg-card font-medium text-ink shadow-[var(--shadow-xs)]"
                      : ""
                  }`}
                >
                  {item}
                </div>
              ))}
            </nav>
          </aside>

          {/* Main - dashboard */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Welcome, Alex</p>
                  <Badge
                    variant="outline"
                    className="gap-1 px-1.5 py-0 text-[10px]"
                  >
                    <Shield className="size-2.5" />
                    Protected
                  </Badge>
                </div>
                <p className="text-[11px] text-muted">
                  @alex · no direct wallet-to-wallet
                </p>
              </div>
              <div className="flex gap-1.5">
                <span className="rounded-full bg-subtle px-2.5 py-1 text-[11px] font-medium text-muted">
                  Send
                </span>
                <span className="rounded-full bg-inverse px-2.5 py-1 text-[11px] font-medium text-on-inverse">
                  New campaign
                </span>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {/* Claimable banner - monochrome */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-line bg-subtle text-muted">
                    <Inbox className="size-3.5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">
                      2 protected transfers ready to claim
                    </p>
                    <p className="text-[11px] text-muted">
                      35 MON in TransferVault
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-inverse px-3 py-1 text-[11px] font-medium text-on-inverse">
                  Claim all
                </span>
              </div>

              {/* Stats - monochrome icons */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-line bg-card px-2.5 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wide text-faint">
                        {s.label}
                      </p>
                      {s.label === "Balance" ? (
                        <Wallet className="size-3 text-faint" strokeWidth={1.75} />
                      ) : s.label === "Claimable" ? (
                        <Inbox className="size-3 text-faint" strokeWidth={1.75} />
                      ) : (
                        <Activity className="size-3 text-faint" strokeWidth={1.75} />
                      )}
                    </div>
                    <p className="mt-1 text-sm font-bold tabular-nums">
                      {s.value}
                      <span className="ml-0.5 text-[10px] font-medium text-muted">
                        MON
                      </span>
                    </p>
                    <p className="text-[10px] text-faint">{s.hint}</p>
                  </div>
                ))}
              </div>

              {/* Protected activity - monochrome icons */}
              <div className="overflow-hidden rounded-xl border border-line">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Activity className="size-3.5 text-muted" strokeWidth={1.75} />
                    <p className="text-xs font-semibold">Protected activity</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]" dot>
                    Live
                  </Badge>
                </div>
                <ul>
                  {activity.map((a, i) => (
                    <li
                      key={a.title}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 ${
                        i < activity.length - 1 ? "border-b border-line/80" : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-line bg-subtle text-muted">
                          {a.out ? (
                            <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                          ) : (
                            <ArrowDownLeft className="size-3.5" strokeWidth={1.75} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {a.title}
                          </p>
                          <p className="truncate text-[11px] text-muted">
                            {a.sub}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] text-faint">
                        {i === 0 ? "2m" : i === 1 ? "1h" : `${i + 1}d`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
