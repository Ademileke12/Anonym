"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatEther } from "viem";
import {
  useBalance,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { useAuth } from "@/providers/auth-provider";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ShareCampaign } from "@/components/campaigns/share-campaign";
import { formatMon, shortAddress, timeAgo } from "@/lib/format";
import {
  Send,
  Download,
  HeartHandshake,
  UserRound,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Eye,
  EyeOff,
  Shield,
  ChevronRight,
  Plus,
  Activity,
  Loader2,
  Inbox,
} from "lucide-react";
import { listCampaignsByOwner } from "@/services/data/campaigns";
import type { Campaign } from "@/services/data/types";
import {
  listClaimableForWallet,
  listProtectedActivity,
  type ProtectedDeposit,
} from "@/services/protocol/ledger";
import { protocolClaimTransfer } from "@/services/protocol/vaults";
import { useMonadNetwork } from "@/hooks/use-monad-network";
import { createClient } from "@/services/supabase/client";
import { monadTestnet } from "@/services/blockchain/chains";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { IconTile } from "@/components/ui/icon-tile";
import {
  formatPrivateValue,
  usePrivateBalances,
} from "@/hooks/use-private-balance";
import type { LucideIcon } from "lucide-react";

export default function DashboardPage() {
  const { user, wallet } = useAuth();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { ensureMonadTestnet } = useMonadNetwork();
  const { toast } = useToast();
  const { enabled: privateBal, mask, reveal, hide, setEnabled: setPrivateBal } =
    usePrivateBalances();
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address: wallet as `0x${string}` | undefined,
    chainId: monadTestnet.id,
    query: { enabled: Boolean(wallet) },
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activity, setActivity] = useState<ProtectedDeposit[]>([]);
  const [claimable, setClaimable] = useState<ProtectedDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);

  const load = useCallback(async () => {
    if (!user || !wallet) return;
    setLoading(true);
    try {
      const [camps, prot, claims] = await Promise.all([
        listCampaignsByOwner(user.id),
        listProtectedActivity(wallet),
        listClaimableForWallet(wallet),
      ]);
      setCampaigns(camps);
      setActivity(prot);
      setClaimable(claims.filter((c) => c.kind === "transfer"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, wallet]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user || !wallet) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`dash:${user.id}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "protected_deposits" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, wallet, load]);

  const raised = campaigns.reduce((a, c) => a + Number(c.amount_raised), 0);
  const sent = activity
    .filter((t) => t.sender_wallet === wallet?.toLowerCase())
    .reduce((a, t) => a + Number(t.amount), 0);
  const received = activity
    .filter(
      (t) =>
        t.recipient_wallet === wallet?.toLowerCase() &&
        (t.status === "claimed" || t.status === "claimable"),
    )
    .reduce((a, t) => a + Number(t.amount), 0);
  const claimableTotal = claimable.reduce((a, d) => a + Number(d.amount), 0);

  const DASHBOARD_ACTIVITY_LIMIT = 8;

  const feedAll = activity.map((d) => {
    const out = d.sender_wallet === wallet?.toLowerCase();
    const isDonation = d.kind === "donation";
    return {
      id: d.id,
      kind: d.kind,
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
    };
  });
  const feed = feedAll.slice(0, DASHBOARD_ACTIVITY_LIMIT);
  const hasMoreActivity = feedAll.length > DASHBOARD_ACTIVITY_LIMIT;

  async function claimOne(deposit: ProtectedDeposit) {
    if (!walletClient || !publicClient || !wallet) {
      toast({
        title: "Connect wallet",
        description: "Claim requires a connected wallet on Monad Testnet.",
        tone: "error",
      });
      return;
    }
    setClaimingId(deposit.id);
    try {
      await ensureMonadTestnet();
      const hash = await protocolClaimTransfer({
        clients: {
          walletClient,
          publicClient,
          account: walletClient.account ?? (wallet as `0x${string}`),
        },
        deposit,
      });
      toast({
        title: "Claimed to your wallet",
        description: `MON released from TransferVault · ${hash.slice(0, 14)}…`,
        tone: "success",
      });
      await load();
    } catch (e) {
      toast({
        title: "Claim failed",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    } finally {
      setClaimingId(null);
    }
  }

  async function claimAll() {
    if (!claimable.length) return;
    if (!walletClient || !publicClient || !wallet) {
      toast({ title: "Connect wallet", tone: "error" });
      return;
    }
    setClaimingAll(true);
    let ok = 0;
    let fail = 0;
    try {
      await ensureMonadTestnet();
      for (const deposit of claimable) {
        if (
          !deposit.on_chain_deposit_id ||
          !deposit.vault_address?.startsWith("0x")
        ) {
          fail += 1;
          continue;
        }
        try {
          await protocolClaimTransfer({
            clients: {
              walletClient,
              publicClient,
              account: walletClient.account ?? (wallet as `0x${string}`),
            },
            deposit,
          });
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      toast({
        title: ok ? `Claimed ${ok} transfer${ok === 1 ? "" : "s"}` : "No claims",
        description: fail ? `${fail} failed` : undefined,
        tone: ok ? "success" : "error",
      });
      await load();
    } finally {
      setClaimingAll(false);
    }
  }

  const stats: {
    label: string;
    value: string;
    unit?: string;
    hint: string;
    icon: LucideIcon;
  }[] = [
    {
      label: "Balance",
      value: balanceLoading
        ? "…"
        : formatPrivateValue(
            balance
              ? formatMon(Number(formatEther(balance.value)), 4)
              : "-",
            mask,
          ),
      unit: mask ? undefined : "MON",
      hint: privateBal ? "Private balance · session only" : "Wallet · Monad Testnet",
      icon: Wallet,
    },
    {
      label: "Claimable",
      value: formatPrivateValue(formatMon(claimableTotal), mask),
      unit: mask ? undefined : "MON",
      hint:
        claimable.length > 0
          ? `${claimable.length} protected transfer${claimable.length === 1 ? "" : "s"}`
          : "No pending claims",
      icon: Inbox,
    },
    {
      label: "Raised",
      value: formatPrivateValue(formatMon(raised), mask),
      unit: mask ? undefined : "MON",
      hint: `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`,
      icon: HeartHandshake,
    },
    {
      label: "Sent",
      value: formatPrivateValue(formatMon(sent), mask),
      unit: mask ? undefined : "MON",
      hint: "Vault deposits out",
      icon: ArrowUpRight,
    },
    {
      label: "Received",
      value: formatPrivateValue(formatMon(received), mask),
      unit: mask ? undefined : "MON",
      hint: "Protected inbound",
      icon: ArrowDownLeft,
    },
  ];

  const quickActions: {
    href: string;
    label: string;
    desc: string;
    icon: LucideIcon;
  }[] = [
    {
      href: "/app/transfer",
      label: "Send privately",
      desc: "To @username via vault",
      icon: Send,
    },
    {
      href: "/app/receive",
      label: "Receive",
      desc: "Share profile · no public wallet",
      icon: Download,
    },
    {
      href: "/app/campaigns/new",
      label: "Create campaign",
      desc: "Vault-backed raise",
      icon: Plus,
    },
    {
      href: "/app/campaigns",
      label: "Browse campaigns",
      desc: "Donate securely",
      icon: HeartHandshake,
    },
    {
      href: user ? `/anonym/@${user.username}` : "/app/onboarding",
      label: "Public profile",
      desc: `@${user?.username ?? "…"}`,
      icon: UserRound,
    },
    {
      href: "/app/backdoor",
      label: "Backdoor",
      desc: "Reveal private details",
      icon: Eye,
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-5 md:p-8">
        <Skeleton className="h-20 w-full rounded-[var(--radius-card)]" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-72 lg:col-span-3" />
          <Skeleton className="h-72 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:space-y-6 sm:p-5 md:p-8">
      {/* Header - clean, no colored washes */}
      <section className="rounded-[var(--radius-card)] border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt=""
                className="size-12 shrink-0 rounded-xl border border-line object-cover sm:size-14 sm:rounded-2xl"
              />
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-subtle text-base font-semibold text-ink sm:size-14 sm:rounded-2xl sm:text-lg">
                {(user?.display_name || user?.username || "A")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1 px-2 py-0.5 text-[11px]">
                  <Shield className="size-3 text-muted" strokeWidth={1.75} />
                  Protected
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {user?.account_type === "startup" ? "Startup" : "Regular"}
                </Badge>
              </div>
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                Welcome
                {user?.display_name ? (
                  <span className="font-semibold text-muted">
                    , {user.display_name}
                  </span>
                ) : null}
              </h1>
              <p className="mt-0.5 truncate text-sm text-muted">
                @{user?.username} · no direct wallet-to-wallet
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => (mask ? reveal() : privateBal ? hide() : setPrivateBal(true))}
              title={
                privateBal
                  ? mask
                    ? "Reveal balances"
                    : "Hide balances"
                  : "Enable private balances"
              }
            >
              {mask ? (
                <Eye className="size-4" />
              ) : (
                <EyeOff className="size-4" />
              )}
              {mask ? "Reveal" : privateBal ? "Hide" : "Private $"}
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/app/transfer">
                <Send className="size-4" /> Send
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/app/receive">
                <Download className="size-4" /> Receive
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/app/campaigns/new">
                <Plus className="size-4" /> New campaign
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Claimable - monochrome banner */}
      {claimable.length > 0 ? (
        <section className="rounded-[var(--radius-card)] border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <IconTile icon={Inbox} />
              <div className="min-w-0">
                <p className="font-semibold tracking-tight">
                  {claimable.length} protected transfer
                  {claimable.length === 1 ? "" : "s"} ready to claim
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {formatMon(claimableTotal)} MON in TransferVault
                </p>
              </div>
            </div>
            <Button
              size="sm"
              disabled={
                claimingAll ||
                !claimable.some(
                  (d) =>
                    d.on_chain_deposit_id && d.vault_address?.startsWith("0x"),
                )
              }
              onClick={() => void claimAll()}
            >
              {claimingAll ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Claiming…
                </>
              ) : (
                "Claim all"
              )}
            </Button>
          </div>
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {claimable.map((d) => {
              const vaultClaimable = Boolean(
                d.on_chain_deposit_id &&
                  d.vault_address?.startsWith("0x") &&
                  d.vault_address.length === 42,
              );
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium tabular-nums">
                      {formatMon(d.amount)} MON
                    </p>
                    <p className="text-xs text-muted">
                      {vaultClaimable
                        ? "TransferVault · claimable"
                        : d.tx_hash
                          ? "Treasury hold · not self-claimable"
                          : "Unfunded"}{" "}
                      · {timeAgo(d.created_at)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={
                      claimingId === d.id || claimingAll || !vaultClaimable
                    }
                    onClick={() => void claimOne(d)}
                  >
                    {claimingId === d.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : vaultClaimable ? (
                      "Claim"
                    ) : (
                      "Held"
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Stats - monochrome tiles with icon tiles */}
      <section>
        <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-faint">
          Overview
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-line bg-card p-3.5 shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-card)] sm:p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-faint sm:text-[11px]">
                  {stat.label}
                </p>
                <IconTile icon={stat.icon} size="sm" className="!size-7 !rounded-lg" />
              </div>
              <p className="mt-2.5 truncate text-lg font-bold tracking-tight tabular-nums sm:text-xl">
                {stat.value}
                {stat.unit ? (
                  <span className="ml-1 text-[11px] font-medium text-muted sm:text-xs">
                    {stat.unit}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 truncate text-[11px] text-faint">{stat.hint}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Activity + actions */}
      <div className="grid gap-4 lg:grid-cols-5 lg:gap-5">
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <Card elevated className="h-full !p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <IconTile icon={Activity} size="sm" />
                <div>
                  <CardTitle className="text-base">Protected activity</CardTitle>
                  <CardDescription className="text-xs">
                    Vault deposits & claims
                  </CardDescription>
                </div>
              </div>
              <Button asChild variant="secondary" size="sm" className="h-8 gap-1 px-2.5 text-xs">
                <Link href="/app/activity">
                  View all
                  <ChevronRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="px-4 py-1 sm:px-5">
              {feed.length === 0 ? (
                <EmptyState
                  icon={Shield}
                  title="No protected activity yet"
                  description="Send or receive via TransferVault. Activity appears here without a public counterparty graph."
                  className="border-0 py-12"
                  action={
                    <Button asChild size="sm">
                      <Link href="/app/transfer">Send privately</Link>
                    </Button>
                  }
                />
              ) : (
                <>
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
                            <p className="truncate text-sm font-medium">
                              {a.title}
                            </p>
                            <p className="truncate text-xs text-muted">{a.sub}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-faint">
                          {timeAgo(a.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {hasMoreActivity ? (
                    <div className="border-t border-line py-3">
                      <Button asChild variant="secondary" size="sm" className="w-full">
                        <Link href="/app/activity">
                          View all activity
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card elevated className="h-full !p-0 overflow-hidden">
            <div className="border-b border-line px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <IconTile icon={Send} size="sm" />
                <div>
                  <CardTitle className="text-base">Quick actions</CardTitle>
                  <CardDescription className="text-xs">
                    Core flows
                  </CardDescription>
                </div>
              </div>
            </div>
            <div className="grid gap-0.5 p-2 sm:p-2.5">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-subtle"
                >
                  <IconTile icon={action.icon} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {action.label}
                    </p>
                    <p className="truncate text-xs text-muted">{action.desc}</p>
                  </div>
                  <ChevronRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              ))}
            </div>
            {wallet ? (
              <div className="border-t border-line px-4 py-3 sm:px-5">
                <p className="text-[10px] uppercase tracking-wide text-faint">
                  Session
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted">
                  {shortAddress(wallet, 6)}
                </p>
              </div>
            ) : null}
          </Card>
        </motion.div>
      </div>

      {/* Campaigns */}
      <section>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight sm:text-lg">
              Your campaigns
            </h2>
            <p className="text-sm text-muted">
              Vault-backed raises · share links, not wallets
            </p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/app/campaigns/new">
              <Plus className="size-4" /> Create
            </Link>
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title="No campaigns yet"
            description="Launch a raise; contributions deposit to a campaign vault."
            action={
              <Button asChild>
                <Link href="/app/campaigns/new">Create campaign</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {campaigns.map((c, i) => {
              const pct =
                Number(c.goal_amount) > 0
                  ? Math.min(
                      100,
                      (Number(c.amount_raised) / Number(c.goal_amount)) * 100,
                    )
                  : 0;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Card
                    elevated
                    padded={false}
                    className="overflow-hidden transition-shadow hover:shadow-[var(--shadow-elevated)]"
                  >
                    <div className="relative h-20 bg-subtle sm:h-28">
                      {c.banner_image || c.featured_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.banner_image || c.featured_image || ""}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-subtle via-muted-bg to-card" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                      <div className="absolute right-2 top-2 flex items-center gap-1.5 sm:right-3 sm:top-3 sm:gap-2">
                        <Badge
                          variant="outline"
                          className="bg-card/90 text-[10px] backdrop-blur-sm sm:text-xs"
                        >
                          {c.status === "active"
                            ? "Live"
                            : c.status === "ended"
                              ? "Ended"
                              : c.status === "completed"
                                ? "Completed"
                                : c.status}
                        </Badge>
                        <ShareCampaign campaign={c} variant="icon" />
                      </div>
                    </div>
                    <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-5">
                      <div>
                        <Link
                          href={`/app/campaigns/${c.id}`}
                          className="text-sm font-semibold tracking-tight hover:underline sm:text-base"
                        >
                          {c.title}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-muted sm:text-xs">
                          {c.visibility === "private"
                            ? "Private link"
                            : "Public"}{" "}
                          · {c.category ?? "General"}
                        </p>
                      </div>
                      <div>
                        <div className="mb-1.5 flex justify-between text-[11px] text-muted sm:text-xs">
                          <span className="tabular-nums">
                            {formatMon(c.amount_raised)} /{" "}
                            {formatMon(c.goal_amount)} MON
                          </span>
                          <span className="font-medium tabular-nums">
                            {Math.round(pct)}%
                          </span>
                        </div>
                        <Progress value={pct} />
                      </div>
                      <ShareCampaign campaign={c} variant="bar" className="hidden sm:flex" />
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="w-full"
                      >
                        <Link href={`/app/campaigns/${c.id}`}>
                          Open campaign
                          <ChevronRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
