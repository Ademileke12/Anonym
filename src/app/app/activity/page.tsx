"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import {
  listProtectedActivity,
  type ProtectedDeposit,
} from "@/services/protocol/ledger";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { IconTile } from "@/components/ui/icon-tile";
import { formatMon, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  ArrowLeft,
} from "lucide-react";

function toFeedItem(d: ProtectedDeposit, wallet: string | null) {
  const out = d.sender_wallet === wallet?.toLowerCase();
  const isDonation = d.kind === "donation";
  return {
    id: d.id,
    title: out
      ? isDonation
        ? `Contributed ${formatMon(d.amount)} MON`
        : `Protected send ${formatMon(d.amount)} MON`
      : isDonation
        ? `Campaign received ${formatMon(d.amount)} MON`
        : `Protected receive ${formatMon(d.amount)} MON`,
    sub: d.anonymous
      ? out
        ? "Anonymous · vault deposit"
        : "Anonymous · claim from vault"
      : out
        ? "Protected deposit"
        : d.status === "claimable"
          ? "Ready to claim"
          : d.status,
    at: d.created_at,
    out,
    status: d.status,
    kind: d.kind,
  };
}

export default function ActivityPage() {
  const { wallet } = useAuth();
  const [rows, setRows] = useState<ProtectedDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const data = await listProtectedActivity(wallet, { limit: 100 });
      setRows(data);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void load();
  }, [load]);

  const feed = rows.map((d) => toFeedItem(d, wallet));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-5 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button asChild variant="secondary" size="sm" className="mb-3 gap-1.5">
            <Link href="/app">
              <ArrowLeft className="size-3.5" />
              Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <Shield className="size-3" />
              Protected
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Activity</h1>
          <p className="mt-1 text-sm text-muted">
            Full vault deposit and claim history for your wallet.
          </p>
        </div>
      </div>

      <Card elevated className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <IconTile icon={Activity} size="sm" />
            <div>
              <CardTitle className="text-base">All activity</CardTitle>
              <CardDescription className="text-xs">
                {loading ? "Loading…" : `${feed.length} item${feed.length === 1 ? "" : "s"}`}
              </CardDescription>
            </div>
          </div>
        </div>

        <div className="px-4 py-1 sm:px-5">
          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : feed.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No protected activity yet"
              description="Send or receive via TransferVault. History will show up here."
              className="border-0 py-12"
              action={
                <Button asChild size="sm">
                  <Link href="/app/transfer">Send privately</Link>
                </Button>
              }
            />
          ) : (
            <ul>
              {feed.map((a, i) => (
                <li
                  key={a.id}
                  className={cn(
                    "flex items-center justify-between gap-3 py-3.5",
                    i < feed.length - 1 && "border-b border-line/80",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile
                      icon={a.out ? ArrowUpRight : ArrowDownLeft}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      <p className="truncate text-xs text-muted">
                        {a.sub}
                        {a.status ? ` · ${a.status}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-faint">
                    {timeAgo(a.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
