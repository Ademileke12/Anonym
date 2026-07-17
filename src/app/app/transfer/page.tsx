"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  markConditionSatisfied,
  type ProtectedDeposit,
} from "@/services/protocol/ledger";
import {
  createPaymentRequest,
  getPaymentRequest,
  markPaymentRequestPaid,
} from "@/services/data/payment-requests";
import { createRecurringSend } from "@/services/data/recurring";
import type {
  BatchRecipientLine,
  ConditionType,
  SendMetadata,
} from "@/services/data/send-types";
import {
  canSettleOnChain,
  isOnChainProtocolEnabled,
  protocolSettlementLabel,
} from "@/services/protocol/config";
import { useMonadNetwork } from "@/hooks/use-monad-network";
import { buildClaimUrl } from "@/lib/claim-link";
import { Card } from "@/components/ui/card";
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
  Copy,
  ChevronDown,
  ChevronUp,
  Users,
  HandCoins,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "send" | "batch" | "request";

type LookupState =
  | { status: "idle" | "checking" | "empty" | "invalid" | "not_found" }
  | { status: "found"; user: User }
  | { status: "self"; user: User }
  | { status: "wallet_external"; wallet: string };

function parseBatch(text: string): BatchRecipientLine[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,\s]+/).filter(Boolean);
      const to = parts[0] ?? "";
      const amount = parts[1] ?? "";
      const note = parts.slice(2).join(" ") || undefined;
      return { to, amount, note };
    })
    .filter((r) => r.to && r.amount);
}

export default function TransferPage() {
  const { wallet, user } = useAuth();
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { ensureMonadTestnet } = useMonadNetwork();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("send");
  const [recipient, setRecipient] = useState(
    () => searchParams.get("to")?.replace(/^@/, "") ?? "",
  );
  const [amount, setAmount] = useState(
    () => searchParams.get("amount") ?? "",
  );
  const [note, setNote] = useState("");
  const [invoice, setInvoice] = useState("");
  const [track, setTrack] = useState("");
  const [grantId, setGrantId] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [conditionType, setConditionType] = useState<ConditionType>("none");
  const [conditionUrl, setConditionUrl] = useState("");
  const [conditionLabel, setConditionLabel] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [splitCount, setSplitCount] = useState("");
  const [recurringDays, setRecurringDays] = useState("");
  const [batchText, setBatchText] = useState("");
  const [requestFor, setRequestFor] = useState("");
  const [lastClaimUrl, setLastClaimUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<ProtectedDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const [payRequestId] = useState(() => searchParams.get("request") ?? "");

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

  // Prefill from payment request deep link
  useEffect(() => {
    if (!payRequestId) return;
    void getPaymentRequest(payRequestId)
      .then((r) => {
        if (!r || r.status !== "open") return;
        setMode("send");
        setAmount(String(r.amount));
        setNote(r.message ?? "");
        if (r.requester_username) setRecipient(r.requester_username);
        else setRecipient(r.requester_wallet);
        toast({
          title: "Payment request loaded",
          description: `Pay ${r.amount} MON to ${r.requester_username ? `@${r.requester_username}` : "requester"}`,
        });
      })
      .catch(console.error);
  }, [payRequestId, toast]);

  useEffect(() => {
    const raw = recipient.trim();
    if (!raw) {
      setLookup({ status: "empty" });
      return;
    }
    setLookup({ status: "checking" });
    let cancelled = false;
    const t = window.setTimeout(() => {
      void lookupUsernameForTransfer(raw).then((res) => {
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
        } else if (res.status === "wallet_external" && res.wallet) {
          setLookup({ status: "wallet_external", wallet: res.wallet });
        } else if (res.status === "not_found") {
          setLookup({ status: "not_found" });
        } else if (res.status === "invalid") {
          setLookup({ status: "invalid" });
        } else {
          setLookup({ status: "empty" });
        }
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [recipient, sessionWallet, user?.id]);

  const metadata: SendMetadata = useMemo(
    () => ({
      invoice: invoice.trim() || undefined,
      track: track.trim() || undefined,
      grant_id: grantId.trim() || undefined,
      memo: note.trim() || undefined,
    }),
    [invoice, track, grantId, note],
  );

  const advancedPayload = useMemo(() => {
    const unlockIso = unlockAt ? new Date(unlockAt).toISOString() : null;
    return {
      unlockAt: unlockIso,
      conditionType:
        conditionType === "none" && unlockIso
          ? ("after_date" as ConditionType)
          : conditionType,
      conditionPayload: {
        unlock_at: unlockIso ?? undefined,
        github_pr:
          conditionType === "github_pr" ? conditionUrl.trim() : undefined,
        url: conditionType === "url_attest" ? conditionUrl.trim() : undefined,
        label: conditionLabel.trim() || undefined,
        satisfied: conditionType === "manual" ? false : undefined,
      },
      metadata,
    };
  }, [unlockAt, conditionType, conditionUrl, conditionLabel, metadata]);

  const canSendOne =
    canSettleOnChain() &&
    !sending &&
    Number(amount) > 0 &&
    (lookup.status === "found" || lookup.status === "wallet_external");

  async function sendOne(
    to: string,
    amt: string,
    opts?: { note?: string; splitGroupId?: string; parentRequestId?: string },
  ) {
    if (!sessionWallet || !walletClient || !publicClient) {
      throw new Error("Connect wallet on Monad Testnet");
    }
    const resolved = await resolveRecipient(to, { allowRawWallet: true });
    if (!resolved) throw new Error(`Recipient not found: ${to}`);
    if (
      resolved.user &&
      (resolved.user.id === user?.id ||
        resolved.wallet === sessionWallet)
    ) {
      throw new Error("Cannot send to yourself");
    }

    await ensureMonadTestnet();
    return protocolTransfer({
      clients: {
        walletClient,
        publicClient,
        account: walletClient.account ?? (sessionWallet as `0x${string}`),
      },
      senderWallet: sessionWallet,
      senderUserId: user?.id ?? null,
      recipientWallet: resolved.wallet,
      recipientUserId: resolved.user?.id ?? null,
      amountMon: amt,
      message: opts?.note ?? (note.trim() || null),
      anonymous: true,
      unlockAt: advancedPayload.unlockAt,
      conditionType: advancedPayload.conditionType,
      conditionPayload: advancedPayload.conditionPayload,
      metadata: advancedPayload.metadata,
      splitGroupId: opts?.splitGroupId ?? null,
      parentRequestId: opts?.parentRequestId ?? (payRequestId || null),
    });
  }

  async function onSend() {
    if (!canSendOne) return;
    setSending(true);
    setLastClaimUrl(null);
    try {
      const n = Number(amount);
      const splits = Math.max(1, Math.floor(Number(splitCount) || 1));
      if (splits > 1) {
        const each = n / splits;
        if (each <= 0) throw new Error("Invalid split");
        const groupId = crypto.randomUUID();
        const results = [];
        for (let i = 0; i < splits; i++) {
          results.push(
            await sendOne(recipient, String(each), { splitGroupId: groupId }),
          );
        }
        const last = results[results.length - 1];
        const url = buildClaimUrl(last.deposit.id, last.deposit.salt);
        setLastClaimUrl(url);
        toast({
          title: `Split into ${splits} claims`,
          description: `Each ${formatMon(each)} MON · last claim link ready`,
          tone: "success",
        });
      } else {
        const result = await sendOne(recipient, amount);
        const url = buildClaimUrl(result.deposit.id, result.deposit.salt);
        setLastClaimUrl(url);
        if (payRequestId) {
          await markPaymentRequestPaid({
            id: payRequestId,
            payer_wallet: sessionWallet,
            payer_user_id: user?.id ?? null,
            deposit_id: result.deposit.id,
          }).catch(console.warn);
        }
        if (recurringDays && Number(recurringDays) >= 1) {
          const resolved = await resolveRecipient(recipient, {
            allowRawWallet: true,
          });
          if (resolved) {
            await createRecurringSend({
              sender_user_id: user?.id ?? null,
              sender_wallet: sessionWallet,
              recipient_wallet: resolved.wallet,
              recipient_user_id: resolved.user?.id ?? null,
              recipient_username: resolved.user?.username ?? null,
              amount: n,
              interval_days: Number(recurringDays),
              message: note.trim() || null,
              metadata,
            }).catch(console.warn);
          }
        }
        toast({
          title:
            lookup.status === "wallet_external"
              ? "Sent · share claim link"
              : `Sent to @${(lookup as { user?: User }).user?.username ?? "user"}`,
          description: [
            result.mode === "vault" ? "TransferVault" : "Hold",
            result.zkProof ? `ZK ${result.zkProof.proveMs}ms` : null,
            result.txHash.slice(0, 12) + "…",
          ]
            .filter(Boolean)
            .join(" · "),
          tone: "success",
        });
      }
      setAmount("");
      setNote("");
      await refresh();
    } catch (e) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    } finally {
      setSending(false);
    }
  }

  async function onBatch() {
    const lines = parseBatch(batchText);
    if (!lines.length) {
      toast({ title: "Add lines: @user amount", tone: "error" });
      return;
    }
    if (!canSettleOnChain()) return;
    setSending(true);
    let ok = 0;
    let fail = 0;
    const links: string[] = [];
    try {
      for (const line of lines) {
        try {
          const r = await sendOne(line.to, line.amount, { note: line.note });
          links.push(buildClaimUrl(r.deposit.id, r.deposit.salt));
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      if (links.length === 1) setLastClaimUrl(links[0]);
      else if (links.length > 1) {
        setLastClaimUrl(links.join("\n"));
      }
      toast({
        title: `Batch done · ${ok} sent`,
        description: fail
          ? `${fail} failed · ${links.length} claim links ready`
          : `${links.length} claim link${links.length === 1 ? "" : "s"} ready`,
        tone: ok ? "success" : "error",
      });
      await refresh();
    } finally {
      setSending(false);
    }
  }

  async function copyClaimFor(deposit: ProtectedDeposit) {
    if (!deposit.salt) {
      toast({ title: "No claim secret on this row", tone: "error" });
      return;
    }
    const url = buildClaimUrl(deposit.id, deposit.salt);
    await navigator.clipboard.writeText(url).catch(() => null);
    setLastClaimUrl(url);
    toast({ title: "Claim link copied", tone: "success" });
  }

  async function unlockCondition(deposit: ProtectedDeposit) {
    try {
      await markConditionSatisfied(deposit.id);
      toast({
        title: "Condition marked satisfied",
        description: "Recipient can claim now (if escrow date also passed).",
        tone: "success",
      });
      await refresh();
    } catch (e) {
      toast({
        title: "Could not unlock",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    }
  }

  async function onCreateRequest() {
    if (!sessionWallet || !user) {
      toast({ title: "Connect and finish onboarding", tone: "error" });
      return;
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast({ title: "Enter amount", tone: "error" });
      return;
    }
    setSending(true);
    try {
      const req = await createPaymentRequest({
        requester_user_id: user.id,
        requester_wallet: sessionWallet,
        requester_username: user.username,
        payer_username: requestFor.replace(/^@/, "") || null,
        amount: n,
        message: note.trim() || null,
        metadata,
      });
      const url = `${window.location.origin}/app/transfer?request=${req.id}`;
      setLastClaimUrl(url);
      await navigator.clipboard.writeText(url).catch(() => null);
      toast({
        title: "Request created",
        description: "Pay link copied — share with the payer",
        tone: "success",
      });
    } catch (e) {
      toast({
        title: "Request failed",
        description:
          e instanceof Error
            ? e.message
            : "Run migration 07_send_suite.sql if tables are missing",
        tone: "error",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 sm:p-5 md:p-8">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Shield className="size-3" />
            Protected send
          </Badge>
          {isOnChainProtocolEnabled() ? (
            <Badge variant="outline">Vault</Badge>
          ) : (
            <Badge variant="muted">{protocolSettlementLabel()}</Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Send</h1>
        <p className="mt-1 text-sm text-muted">
          Vault deposits for @users or any wallet. Share a claim link when needed.
        </p>
      </div>

      {/* Simple mode tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-subtle p-1">
        {(
          [
            ["send", "Send", Send],
            ["batch", "Batch", Users],
            ["request", "Request", HandCoins],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
              mode === id
                ? "bg-card text-ink shadow-[var(--shadow-xs)]"
                : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      <Card elevated className="space-y-4">
        {mode === "send" && (
          <>
            <div>
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                placeholder="@username or 0x…"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                autoComplete="off"
              />
              <RecipientHint lookup={lookup} />
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
              <Label htmlFor="note">Memo (optional)</Label>
              <Input
                id="note"
                placeholder="Private note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </>
        )}

        {mode === "batch" && (
          <div>
            <Label htmlFor="batch">Recipients</Label>
            <Textarea
              id="batch"
              className="min-h-[140px] font-mono text-sm"
              placeholder={"@alice 10\n@bob 5 prize-ui\n0xabc… 2.5"}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-faint">
              One per line: <code>to amount [note]</code>
            </p>
          </div>
        )}

        {mode === "request" && (
          <>
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
              <Label htmlFor="for">From (optional @user)</Label>
              <Input
                id="for"
                placeholder="@payer"
                value={requestFor}
                onChange={(e) => setRequestFor(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="note">Message</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What is this for?"
              />
            </div>
          </>
        )}

        {/* Advanced — collapsed by default */}
        {mode !== "request" ? (
          <div className="border-t border-line pt-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm font-medium text-muted"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              More options
              {showAdvanced ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
            {showAdvanced ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="inv">Invoice #</Label>
                    <Input
                      id="inv"
                      value={invoice}
                      onChange={(e) => setInvoice(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="track">Prize track</Label>
                    <Input
                      id="track"
                      value={track}
                      onChange={(e) => setTrack(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="grant">Grant ID</Label>
                  <Input
                    id="grant"
                    value={grantId}
                    onChange={(e) => setGrantId(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="unlock">Escrow unlock (date/time)</Label>
                  <Input
                    id="unlock"
                    type="datetime-local"
                    value={unlockAt}
                    onChange={(e) => setUnlockAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cond">Conditional release</Label>
                  <select
                    id="cond"
                    className="flex h-11 w-full rounded-[var(--radius-input)] border border-line-strong bg-card px-3 text-base sm:text-sm"
                    value={conditionType}
                    onChange={(e) =>
                      setConditionType(e.target.value as ConditionType)
                    }
                  >
                    <option value="none">None</option>
                    <option value="after_date">After date (use escrow)</option>
                    <option value="github_pr">GitHub PR URL</option>
                    <option value="url_attest">Form / URL attest</option>
                    <option value="manual">Manual unlock later</option>
                  </select>
                </div>
                {(conditionType === "github_pr" ||
                  conditionType === "url_attest") && (
                  <div>
                    <Label htmlFor="curl">Condition URL</Label>
                    <Input
                      id="curl"
                      value={conditionUrl}
                      onChange={(e) => setConditionUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                )}
                {conditionType !== "none" && (
                  <div>
                    <Label htmlFor="clabel">Milestone label</Label>
                    <Input
                      id="clabel"
                      value={conditionLabel}
                      onChange={(e) => setConditionLabel(e.target.value)}
                      placeholder="Hackathon finals"
                    />
                  </div>
                )}
                {mode === "send" && (
                  <>
                    <div>
                      <Label htmlFor="split">Split into N claims</Label>
                      <Input
                        id="split"
                        type="number"
                        min="1"
                        max="20"
                        placeholder="1"
                        value={splitCount}
                        onChange={(e) => setSplitCount(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="rec">Recurring every N days</Label>
                      <Input
                        id="rec"
                        type="number"
                        min="1"
                        placeholder="Off"
                        value={recurringDays}
                        onChange={(e) => setRecurringDays(e.target.value)}
                      />
                      <p className="mt-1 text-[11px] text-faint">
                        Saves a schedule after this send (you re-confirm each run).
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={
            sending ||
            !canSettleOnChain() ||
            (mode === "send" && !canSendOne) ||
            (mode === "batch" && !batchText.trim()) ||
            (mode === "request" && !(Number(amount) > 0))
          }
          onClick={() => {
            if (mode === "send") void onSend();
            else if (mode === "batch") void onBatch();
            else void onCreateRequest();
          }}
        >
          {sending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Shield className="size-4" />
          )}
          {sending
            ? "Confirm in wallet…"
            : mode === "batch"
              ? "Send batch"
              : mode === "request"
                ? "Create pay link"
                : "Send protected"}
        </Button>
      </Card>

      {lastClaimUrl ? (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Share this link</p>
          <p className="break-all font-mono text-xs text-muted">{lastClaimUrl}</p>
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => {
              void navigator.clipboard.writeText(lastClaimUrl);
              toast({ title: "Copied", tone: "success" });
            }}
          >
            <Copy className="size-4" /> Copy link
          </Button>
        </Card>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent</h2>
          <Button asChild variant="secondary" size="sm">
            <Link href="/app">Dashboard</Link>
          </Button>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : history.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No sends yet"
            description="Send to @user or 0x — they claim via link or dashboard."
            className="py-10"
          />
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {history.slice(0, 8).map((t) => {
                const out = t.sender_wallet === sessionWallet;
                const cond = t.condition_type ?? "none";
                const lockedCond =
                  out &&
                  t.status === "claimable" &&
                  cond !== "none" &&
                  cond !== "after_date" &&
                  !(t.condition_payload as { satisfied?: boolean } | undefined)
                    ?.satisfied;
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {out ? "Out" : "In"} · {formatMon(t.amount)} MON
                      </p>
                      <p className="truncate text-xs text-muted">
                        {t.status}
                        {t.unlock_at ? " · escrow" : ""}
                        {cond !== "none" && cond ? ` · ${cond}` : ""}
                        {t.metadata && Object.keys(t.metadata).length
                          ? " · meta"
                          : ""}
                      </p>
                      {out && t.status === "claimable" ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className="text-[11px] font-medium text-ink underline-offset-2 hover:underline"
                            onClick={() => void copyClaimFor(t)}
                          >
                            Copy claim link
                          </button>
                          {lockedCond ? (
                            <button
                              type="button"
                              className="text-[11px] font-medium text-muted underline-offset-2 hover:underline"
                              onClick={() => void unlockCondition(t)}
                            >
                              Mark condition done
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-faint">
                      {timeAgo(t.created_at)}
                    </span>
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

function RecipientHint({ lookup }: { lookup: LookupState }) {
  if (lookup.status === "idle" || lookup.status === "empty") {
    return (
      <p className="mt-1.5 text-xs text-faint">
        @username on Anonym, or any 0x wallet (gets a claim link).
      </p>
    );
  }
  if (lookup.status === "checking") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <Loader2 className="size-3 animate-spin" /> Checking…
      </p>
    );
  }
  if (lookup.status === "invalid") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <AlertCircle className="size-3.5 text-faint" /> Invalid format
      </p>
    );
  }
  if (lookup.status === "not_found") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <XCircle className="size-3.5 text-faint" /> Username not on Anonym
      </p>
    );
  }
  if (lookup.status === "self") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <AlertCircle className="size-3.5 text-faint" /> That&apos;s you
      </p>
    );
  }
  if (lookup.status === "wallet_external") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink">
        <CheckCircle2 className="size-3.5 text-muted" /> External wallet · claim
        link after send
      </p>
    );
  }
  if (lookup.status === "found" || lookup.status === "self") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink">
        <CheckCircle2 className="size-3.5 text-muted" /> @{lookup.user.username}
        {lookup.user.display_name ? ` · ${lookup.user.display_name}` : ""}
      </p>
    );
  }
  return null;
}
