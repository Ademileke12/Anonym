"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useAuth } from "@/providers/auth-provider";
import {
  lookupUsernameForTransfer,
  resolveRecipient,
} from "@/services/data/users";
import type { User } from "@/services/data/types";
import { protocolTransfer } from "@/services/protocol/vaults";
import {
  listProtectedActivity,
  type ProtectedDeposit,
} from "@/services/protocol/ledger";
import {
  canSettleOnChain,
  isOnChainProtocolEnabled,
  protocolSettlementLabel,
} from "@/services/protocol/config";
import { useMonadNetwork } from "@/hooks/use-monad-network";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatMon, timeAgo } from "@/lib/format";
import {
  Shield,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LookupState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "not_found" }
  | { status: "found"; user: User }
  | { status: "self"; user: User };

export default function TransferPage() {
  const { wallet, user } = useAuth();
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { ensureMonadTestnet } = useMonadNetwork();
  const { toast } = useToast();
  const [recipient, setRecipient] = useState(
    () => searchParams.get("to")?.replace(/^@/, "") ?? "",
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<ProtectedDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });

  const sessionWallet = (wallet ?? address ?? "").toLowerCase();

  const refresh = useCallback(async () => {
    if (!sessionWallet) return;
    const rows = await listProtectedActivity(sessionWallet);
    setHistory(rows.filter((r) => r.kind === "transfer"));
  }, [sessionWallet]);

  useEffect(() => {
    void refresh()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refresh]);

  // Live username existence check
  useEffect(() => {
    const raw = recipient.trim();
    if (!raw) {
      setLookup({ status: "empty" });
      return;
    }

    setLookup({ status: "checking" });
    let cancelled = false;
    const t = window.setTimeout(() => {
      void lookupUsernameForTransfer(raw)
        .then((res) => {
          if (cancelled) return;
          if (res.status === "found" && res.user) {
            const isSelf =
              res.user.wallet_address.toLowerCase() === sessionWallet ||
              res.user.id === user?.id;
            setLookup(
              isSelf
                ? { status: "self", user: res.user }
                : { status: "found", user: res.user },
            );
          } else if (res.status === "not_found") {
            setLookup({ status: "not_found" });
          } else if (res.status === "invalid") {
            setLookup({ status: "invalid" });
          } else {
            setLookup({ status: "empty" });
          }
        })
        .catch(() => {
          if (!cancelled) setLookup({ status: "not_found" });
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [recipient, sessionWallet, user?.id]);

  const canSend =
    canSettleOnChain() &&
    lookup.status === "found" &&
    !sending &&
    Number(amount) > 0;

  async function send() {
    const from = sessionWallet;
    if (!from) {
      toast({ title: "Connect wallet first", tone: "error" });
      return;
    }

    if (lookup.status === "self") {
      toast({
        title: "Cannot send to yourself",
        description: "Choose another registered @username.",
        tone: "error",
      });
      return;
    }

    if (lookup.status !== "found") {
      toast({
        title:
          lookup.status === "not_found"
            ? "User not found"
            : "Enter a valid @username",
        description:
          "You can only send to usernames registered on Anonym. Check the spelling.",
        tone: "error",
      });
      return;
    }

    const resolved = await resolveRecipient(recipient);
    if (!resolved?.user) {
      toast({
        title: "User not found",
        description: "This username is not registered on Anonym.",
        tone: "error",
      });
      return;
    }

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast({ title: "Enter a valid amount", tone: "error" });
      return;
    }
    if (!walletClient || !publicClient) {
      toast({
        title: "Wallet client unavailable",
        description: "Connect on Monad Testnet.",
        tone: "error",
      });
      return;
    }

    setSending(true);
    try {
      await ensureMonadTestnet();
      const result = await protocolTransfer({
        clients: {
          walletClient,
          publicClient,
          account: walletClient.account ?? (from as `0x${string}`),
        },
        senderWallet: from,
        senderUserId: user?.id ?? null,
        recipientWallet: resolved.wallet,
        recipientUserId: resolved.user.id,
        amountMon: String(n),
        message: note.trim() || null,
        anonymous: true,
      });

      toast({
        title: `Sent to @${resolved.user.username}`,
        description: [
          result.mode === "vault"
            ? `MON deposited to TransferVault · ${result.txHash.slice(0, 12)}…`
            : `MON held · ${result.txHash.slice(0, 12)}…`,
          result.zkProof
            ? `ZK proof ${result.zkProof.proveMs}ms · nullifier ready`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        tone: "success",
      });
      setAmount("");
      setNote("");
      setRecipient("");
      setLookup({ status: "empty" });
      await refresh();
    } catch (e) {
      toast({
        title: "Protected transfer failed",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 sm:p-5 md:p-8">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Shield className="size-3" />
            Protected by Anonym
          </Badge>
          {isOnChainProtocolEnabled() ? (
            <Badge variant="green" dot>
              Vault live · claimable
            </Badge>
          ) : canSettleOnChain() ? (
            <Badge variant="yellow">Treasury hold · real MON debit</Badge>
          ) : (
            <Badge variant="red">Settlement not configured</Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Protected transfer</h1>
        <p className="mt-1 text-muted">
          Send only to registered @usernames. We check Anonym before you sign.
        </p>
        <p className="mt-2 text-xs text-faint">
          Settlement: {protocolSettlementLabel()}
        </p>
      </div>

      {!canSettleOnChain() ? (
        <Card className="border-line bg-subtle">
          <p className="text-sm font-medium text-ink">
            Configure settlement before sending
          </p>
          <p className="mt-1 text-xs text-muted">
            Set{" "}
            <code className="text-[11px]">NEXT_PUBLIC_TRANSFER_VAULT</code> so
            MON settles on-chain.
          </p>
        </Card>
      ) : null}

      <Card elevated>
        <CardHeader>
          <CardTitle>Create protected deposit</CardTitle>
          <CardDescription>
            Recipient must exist on Anonym. Unknown usernames are blocked.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="to">Recipient username</Label>
            <Input
              id="to"
              placeholder="@username"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                lookup.status === "found" && "border-ink/30",
                (lookup.status === "not_found" ||
                  lookup.status === "invalid" ||
                  lookup.status === "self") &&
                  recipient.trim() &&
                  "border-line-strong",
              )}
            />
            <RecipientLookupHint lookup={lookup} />
          </div>
          <div>
            <Label htmlFor="amount">Amount (MON)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="note">Private note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Only visible inside Anonym to the parties"
            />
          </div>
          <div className="rounded-[var(--radius-panel)] border border-line bg-subtle px-4 py-3 text-sm text-muted">
            <p className="font-medium text-ink">How it works</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
              <li>We verify @username exists on Anonym</li>
              <li>You sign, real MON deposits into TransferVault</li>
              <li>They claim on the dashboard into their wallet</li>
            </ol>
          </div>
          <Button
            className="w-full"
            onClick={() => void send()}
            disabled={!canSend}
          >
            {sending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Shield className="size-4" />
            )}
            {sending
              ? "Confirm in wallet…"
              : !canSettleOnChain()
                ? "Settlement not configured"
                : lookup.status === "not_found"
                  ? "User not found"
                  : lookup.status === "self"
                    ? "Cannot send to yourself"
                    : lookup.status !== "found"
                      ? "Enter a registered @username"
                      : "Send protected transfer"}
          </Button>
        </div>
      </Card>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Protected activity</h2>
          <Button asChild variant="secondary" size="sm">
            <Link href="/app">Claim on dashboard</Link>
          </Button>
        </div>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : history.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No protected transfers yet"
            description="Create a deposit to a registered @username."
          />
        ) : (
          <Card padded={false} className="overflow-hidden">
            <ul className="divide-y divide-line">
              {history.map((t) => {
                const out = t.sender_wallet === sessionWallet;
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {out ? "Outgoing" : "Incoming"} · {formatMon(t.amount)}{" "}
                        {t.token}
                      </p>
                      <p className="text-xs text-muted">
                        {t.status === "claimable"
                          ? out
                            ? "Awaiting recipient claim"
                            : "Ready to claim"
                          : t.status}
                        {t.message ? ` · ${t.message}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          t.status === "claimed"
                            ? "green"
                            : t.status === "claimable"
                              ? "yellow"
                              : "muted"
                        }
                      >
                        {t.status}
                      </Badge>
                      <p className="mt-1 text-xs text-faint">
                        {timeAgo(t.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function RecipientLookupHint({ lookup }: { lookup: LookupState }) {
  if (lookup.status === "idle" || lookup.status === "empty") {
    return (
      <p className="mt-1.5 text-xs text-faint">
        Only registered Anonym usernames can receive protected transfers.
      </p>
    );
  }
  if (lookup.status === "checking") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <Loader2 className="size-3 animate-spin" /> Checking username…
      </p>
    );
  }
  if (lookup.status === "invalid") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <AlertCircle className="size-3.5 text-faint" strokeWidth={1.75} />
        Use 3–30 characters: letters, numbers, underscore (e.g. @alice)
      </p>
    );
  }
  if (lookup.status === "not_found") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <XCircle className="size-3.5 text-faint" strokeWidth={1.75} />
        No Anonym user with this username. You cannot send to them.
      </p>
    );
  }
  if (lookup.status === "self") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <AlertCircle className="size-3.5 text-faint" strokeWidth={1.75} />
        That&apos;s your own username. Choose someone else.
      </p>
    );
  }
  // found
  const u = lookup.user;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink">
      <CheckCircle2 className="size-3.5 text-muted" strokeWidth={1.75} />
      Verified · @{u.username}
      {u.display_name ? ` · ${u.display_name}` : ""}
      {u.account_type === "startup" ? " · Startup" : ""}
    </p>
  );
}
