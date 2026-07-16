"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { useAuth } from "@/providers/auth-provider";
import {
  endCampaign,
  getCampaign,
  listDonationsForCampaign,
  subscribeCampaign,
} from "@/services/data/campaigns";
import {
  protocolDonate,
  protocolWithdrawCampaign,
  readCampaignVaultBalance,
} from "@/services/protocol/vaults";
import { getCampaignVault } from "@/services/protocol/ledger";
import { createClient } from "@/services/supabase/client";
import { useMonadNetwork } from "@/hooks/use-monad-network";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountdown } from "@/hooks/use-countdown";
import { formatMon, timeAgo } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ShareCampaign } from "@/components/campaigns/share-campaign";
import { formatEther } from "viem";
import { Loader2, Shield, StopCircle } from "lucide-react";
import type { Campaign, User } from "@/services/data/types";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, wallet, isAuthenticated } = useAuth();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { ensureMonadTestnet } = useMonadNetwork();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<
    (Campaign & { owner: User | null }) | null
  >(null);
  const [contributions, setContributions] = useState<
    {
      id: string;
      amount: number;
      anonymous: boolean;
      message: string | null;
      created_at: string;
      status: string;
      sender_label: string;
    }[]
  >([]);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [vaultBalance, setVaultBalance] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("10");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [sending, setSending] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    const c = await getCampaign(params.id);
    setCampaign(c);
    if (!c) return;

    // Protocol vaults table may be missing until migration 06 is applied
    let vaultAddr: string | null = c.vault_address ?? null;
    try {
      const vault = await getCampaignVault(c.id);
      vaultAddr = vault?.vault_address ?? vaultAddr;
    } catch (e) {
      console.warn("campaign_vaults unavailable", e);
    }
    setVaultAddress(vaultAddr);

    // Use legacy donations table for public campaign contributions list
    // (protected_deposits RLS restricts reads to sender/recipient only)
    const dons = await listDonationsForCampaign(c.id);
    const wallets = [
      ...new Set(
        dons
          .filter((d) => !d.anonymous && d.sender_wallet)
          .map((d) => d.sender_wallet as string),
      ),
    ];
    const nameByWallet = new Map<string, string>();
    if (wallets.length > 0) {
      const supabase = createClient();
      const { data: users } = await supabase
        .from("users")
        .select("wallet_address, username, display_name")
        .in("wallet_address", wallets);
      for (const u of users ?? []) {
        nameByWallet.set(
          u.wallet_address.toLowerCase(),
          u.username ? `@${u.username}` : u.display_name || "Supporter",
        );
      }
    }
    setContributions(
      dons.map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        anonymous: d.anonymous,
        message: d.message,
        created_at: d.created_at,
        status: "legacy",
        sender_label: d.anonymous
          ? "Anonymous"
          : (d.sender_wallet &&
              nameByWallet.get(d.sender_wallet.toLowerCase())) ||
            "Supporter",
      })),
    );

    if (
      publicClient &&
      vaultAddr?.startsWith("0x") &&
      vaultAddr.length === 42
    ) {
      try {
        const bal = await readCampaignVaultBalance(publicClient, vaultAddr);
        setVaultBalance(bal);
      } catch {
        setVaultBalance(BigInt(0));
      }
    }
  }, [params.id, publicClient]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!params.id) return;
    return subscribeCampaign(params.id, () => {
      void refresh();
    });
  }, [params.id, refresh]);

  const cd = useCountdown(campaign?.deadline ?? null);
  const expired = campaign?.status === "ended" || Boolean(cd?.expired);
  const pct =
    campaign && Number(campaign.goal_amount) > 0
      ? (Number(campaign.amount_raised) / Number(campaign.goal_amount)) * 100
      : 0;

  const sessionAddr = (wallet ?? address ?? "").toLowerCase();
  const isOwner = Boolean(
    (user && campaign?.owner && user.id === campaign.owner.id) ||
      (sessionAddr &&
        campaign?.owner &&
        (campaign.owner.wallet_address?.toLowerCase() === sessionAddr ||
          campaign.owner.monad_receiving_address?.toLowerCase() ===
            sessionAddr)),
  );

  async function donate() {
    const sender = (wallet ?? address)?.toLowerCase();
    if (!campaign || !sender) {
      toast({ title: "Connect wallet to donate", tone: "error" });
      return;
    }
    if (isOwner) {
      toast({
        title: "Cannot donate to your own campaign",
        description: "Creators cannot contribute to campaigns they own.",
        tone: "error",
      });
      return;
    }
    if (expired) {
      toast({ title: "Campaign has ended", tone: "error" });
      return;
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast({ title: "Enter a valid amount", tone: "error" });
      return;
    }

    const ownerWallet =
      campaign.owner?.monad_receiving_address ||
      campaign.owner?.wallet_address;
    if (!ownerWallet) {
      toast({
        title: "Campaign owner not ready",
        description: "Owner must complete profile first.",
        tone: "error",
      });
      return;
    }
    if (ownerWallet.toLowerCase() === sender) {
      toast({
        title: "Cannot donate to your own campaign",
        description: "Creators cannot contribute to campaigns they own.",
        tone: "error",
      });
      return;
    }

    if (!walletClient || !publicClient) {
      toast({
        title: "Wallet client unavailable",
        description: "Connect MetaMask / Rabby on Monad Testnet.",
        tone: "error",
      });
      return;
    }

    setSending(true);
    // Optimistic total
    setCampaign((c) =>
      c ? { ...c, amount_raised: Number(c.amount_raised) + n } : c,
    );
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticLabel = anonymous
      ? "Anonymous"
      : user?.username
        ? `@${user.username}`
        : "You";
    setContributions((prev) => [
      {
        id: tempId,
        amount: n,
        anonymous,
        message: message.trim() || null,
        created_at: new Date().toISOString(),
        status: "pending",
        sender_label: optimisticLabel,
      },
      ...prev,
    ]);

    try {
      await ensureMonadTestnet();
      const result = await protocolDonate({
        clients: {
          walletClient,
          publicClient,
          account: walletClient.account ?? (sender as `0x${string}`),
        },
        campaignId: campaign.id,
        ownerWallet,
        senderWallet: sender,
        senderUserId: user?.id ?? null,
        amountMon: String(n),
        message: message.trim() || null,
        anonymous,
      });

      toast({
        title: "Protected contribution sent",
        description: result.ledgerError
          ? `MON sent on-chain (${result.txHash.slice(0, 12)}…). Ledger note: ${result.ledgerError}`
          : "Funds deposited to the campaign vault — not the owner's public wallet.",
        tone: "success",
      });
      setMessage("");
      setVaultAddress(result.vault);
    } catch (e) {
      setCampaign((c) =>
        c
          ? {
              ...c,
              amount_raised: Math.max(0, Number(c.amount_raised) - n),
            }
          : c,
      );
      setContributions((prev) => prev.filter((d) => d.id !== tempId));
      toast({
        title: "Donation failed",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
      return;
    } finally {
      setSending(false);
    }

    try {
      await refresh();
    } catch {
      // Donation already confirmed on-chain; refresh failure is non-fatal
    }
  }

  async function withdraw() {
    if (!walletClient || !publicClient || !vaultAddress?.startsWith("0x")) {
      toast({
        title: "Withdraw unavailable",
        description:
          "On-chain campaign vault required. Deploy CampaignVaultFactory or use ledger mode.",
        tone: "error",
      });
      return;
    }
    setWithdrawing(true);
    try {
      await ensureMonadTestnet();
      const hash = await protocolWithdrawCampaign({
        clients: {
          walletClient,
          publicClient,
          account:
            walletClient.account ??
            ((wallet ?? address) as `0x${string}`),
        },
        vaultAddress,
      });
      toast({
        title: "Withdrawal submitted",
        description: hash.slice(0, 18) + "…",
        tone: "success",
      });
      await refresh();
    } catch (e) {
      toast({
        title: "Withdraw failed",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    } finally {
      setWithdrawing(false);
    }
  }

  async function confirmEndCampaign() {
    if (!user || !campaign) return;
    if (campaign.status === "ended" || campaign.status === "completed") {
      setEndDialogOpen(false);
      toast({ title: "Campaign already closed", tone: "error" });
      return;
    }

    setEnding(true);
    try {
      await endCampaign(campaign.id, user.id);
      setEndDialogOpen(false);
      toast({
        title: "Campaign ended",
        description:
          "Supporters can no longer donate. Vault withdraw still works.",
        tone: "success",
      });
      await refresh();
    } catch (e) {
      toast({
        title: "Could not end campaign",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    } finally {
      setEnding(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return <div className="p-8 text-muted">Campaign not found.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
      <ConfirmDialog
        open={endDialogOpen}
        title="End this campaign?"
        description={`“${campaign.title}” will close immediately. Supporters can no longer donate. You can still withdraw vault funds if any remain. This cannot be undone.`}
        confirmLabel="End campaign"
        cancelLabel="Keep open"
        tone="danger"
        loading={ending}
        onCancel={() => {
          if (!ending) setEndDialogOpen(false);
        }}
        onConfirm={() => void confirmEndCampaign()}
      />
      {campaign.banner_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={campaign.banner_image}
          alt=""
          className="h-44 w-full rounded-[var(--radius-card)] object-cover border border-line md:h-56"
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="outline">
              {!expired && campaign.status === "active"
                ? "Live"
                : expired
                  ? "Ended"
                  : campaign.status === "completed"
                    ? "Completed"
                    : campaign.status}
            </Badge>
            {campaign.category ? (
              <Badge variant="muted">{campaign.category}</Badge>
            ) : null}
            <Badge variant="outline">{campaign.visibility}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{campaign.title}</h1>
          <p className="mt-2 text-muted">
            by{" "}
            {campaign.owner ? (
              <a
                href={`/anonym/@${campaign.owner.username}`}
                className="font-medium text-ink hover:underline"
              >
                @{campaign.owner.username}
              </a>
            ) : (
              "unknown"
            )}
          </p>
        </div>
        <ShareCampaign campaign={campaign} variant="menu" />
      </div>

      <ShareCampaign campaign={campaign} variant="bar" />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {campaign.description ?? "No description provided."}
            </p>
            {campaign.reason ? (
              <p className="mt-4 text-sm">
                <span className="font-medium text-ink">Reason: </span>
                <span className="text-muted">{campaign.reason}</span>
              </p>
            ) : null}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Protected contributions</h2>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Shield className="size-3" />
                Vault
              </Badge>
            </div>
            {contributions.length === 0 ? (
              <p className="text-sm text-muted">
                No contributions yet. Be the first to donate securely.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {contributions.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {d.anonymous
                          ? "Anonymous"
                          : d.sender_label || "Supporter"}
                      </p>
                      {d.message ? (
                        <p className="text-xs text-muted">{d.message}</p>
                      ) : null}
                      {d.status && d.status !== "legacy" ? (
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-faint">
                          {d.status}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatMon(d.amount)} MON
                      </p>
                      <p className="text-xs text-faint">
                        {timeAgo(d.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card elevated>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted">Raised</span>
              <span className="font-semibold">
                {formatMon(campaign.amount_raised)} /{" "}
                {formatMon(campaign.goal_amount)} MON
              </span>
            </div>
            <Progress value={pct} />
            <p className="mt-2 text-xs text-faint">
              {formatMon(
                Math.max(
                  0,
                  Number(campaign.goal_amount) - Number(campaign.amount_raised),
                ),
              )}{" "}
              MON remaining · {contributions.length} supporter
              {contributions.length === 1 ? "" : "s"}
              {!expired && campaign.status === "active" ? " · Live" : ""}
              {expired || campaign.status === "ended"
                ? " · Ended"
                : campaign.status === "completed"
                  ? " · Completed"
                  : ""}
            </p>
            {cd && !cd.expired && campaign.status === "active" ? (
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[
                  ["Days", cd.days],
                  ["Hrs", cd.hours],
                  ["Min", cd.minutes],
                  ["Sec", cd.seconds],
                ].map(([label, val]) => (
                  <div
                    key={label as string}
                    className="rounded-lg bg-subtle py-2"
                  >
                    <p className="text-lg font-semibold tabular-nums">{val}</p>
                    <p className="text-[10px] uppercase tracking-wide text-faint">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                {campaign.status === "completed"
                  ? "Campaign completed"
                  : "Campaign closed"}
              </p>
            )}
          </Card>

          {isOwner ? (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Shield className="size-4 text-muted" strokeWidth={1.75} />
                <h2 className="font-semibold">Campaign vault</h2>
              </div>
              <p className="text-sm text-muted">
                Contributions land in a protocol vault — not your public wallet.
                Withdraw when you need funds.
              </p>
              <div className="mt-3 rounded-xl bg-subtle px-3 py-2.5">
                <p className="text-xs uppercase tracking-wide text-faint">
                  On-chain vault balance
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">
                  {vaultAddress?.startsWith("0x")
                    ? `${formatMon(Number(formatEther(vaultBalance)), 4)} MON`
                    : "Ledger mode"}
                </p>
                {vaultAddress ? (
                  <p className="mt-1 truncate font-mono text-[10px] text-faint">
                    {vaultAddress.startsWith("0x")
                      ? vaultAddress
                      : "Virtual vault (deploy factory for on-chain)"}
                  </p>
                ) : null}
              </div>
              <Button
                className="mt-4 w-full"
                variant="secondary"
                disabled={
                  withdrawing ||
                  !vaultAddress?.startsWith("0x") ||
                  vaultBalance === BigInt(0)
                }
                onClick={() => void withdraw()}
              >
                {withdrawing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Withdrawing…
                  </>
                ) : (
                  "Withdraw vault balance"
                )}
              </Button>

              {campaign.status === "active" || campaign.status === "draft" ? (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-xs text-muted">
                    End fundraising early (Regular or Startup). Does not delete
                    the campaign or vault balance.
                  </p>
                  <Button
                    className="mt-3 w-full"
                    variant="danger"
                    disabled={ending}
                    onClick={() => setEndDialogOpen(true)}
                  >
                    <StopCircle className="size-4" /> End campaign
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-center text-xs text-faint">
                  Campaign status: {campaign.status}
                </p>
              )}
            </Card>
          ) : null}

          <Card>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Donate</h2>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Shield className="size-3" />
                Protected by Anonym
              </Badge>
            </div>
            {!isAuthenticated ? (
              <p className="text-sm text-muted">Connect a wallet to support.</p>
            ) : isOwner ? (
              <div className="rounded-xl border border-line bg-subtle px-4 py-3">
                <p className="text-sm font-medium text-ink">
                  You own this campaign
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Creators cannot donate to their own raises. Share the campaign
                  link so others can contribute, or withdraw from the vault
                  when ready.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="amt">Amount (MON)</Label>
                  <Input
                    id="amt"
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={expired}
                  />
                </div>
                <div>
                  <Label htmlFor="msg">Message (optional)</Label>
                  <Textarea
                    id="msg"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={expired}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Visibility</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={anonymous ? "primary" : "secondary"}
                      className="h-10 w-full px-3 text-sm font-medium"
                      onClick={() => setAnonymous(true)}
                      disabled={expired}
                    >
                      Anonymous
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!anonymous ? "primary" : "secondary"}
                      className="h-10 w-full px-3 text-sm font-medium"
                      onClick={() => setAnonymous(false)}
                      disabled={expired}
                    >
                      Reveal username
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={expired || sending}
                  onClick={() => void donate()}
                >
                  {expired ? (
                    "Ended"
                  ) : sending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Confirm in
                      wallet…
                    </>
                  ) : (
                    <>
                      <Shield className="size-4" /> Donate Securely
                    </>
                  )}
                </Button>
                <p className="text-xs text-faint">
                  Funds go to the campaign vault via Anonym protocol — never
                  direct to the owner&apos;s public wallet.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
