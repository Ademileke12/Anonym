"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/services/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { usePublicClient, useWalletClient } from "wagmi";
import { useMonadNetwork } from "@/hooks/use-monad-network";
import { protocolClaimTransfer } from "@/services/protocol/vaults";
import { listClaimableForWallet, type ProtectedDeposit } from "@/services/protocol/ledger";
import {
  Key,
  Webhook,
  CreditCard,
  Copy,
  Check,
  RefreshCw,
  Plus,
  ExternalLink,
  Shield,
  Activity,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  Clock,
  Server,
  ArrowLeft,
  X,
  ChevronDown,
  Zap,
  Wallet,
  Inbox,
} from "lucide-react";
import { shortAddress, timeAgo, formatMon } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                    Types                                    */
/* -------------------------------------------------------------------------- */

interface Merchant {
  id: string;
  name: string;
  email: string;
  api_key_prefix: string;
  webhook_url: string | null;
  status: string;
  created_at: string;
  payout_address: string | null;
}

interface PaymentIntent {
  id: string;
  amount: number;
  token: string;
  status: string;
  description: string | null;
  payer_label: string | null;
  tx_hash: string | null;
  paid_at: string | null;
  settled_at: string | null;
  vault_address: string | null;
  commitment_hash: string | null;
  salt: string | null;
  metadata: Record<string, unknown>;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: string;
  created_at: string;
}

interface ManagedWallet {
  id: string;
  address: string;
  label: string | null;
  user_identifier: string | null;
  derivation_index: number;
  status: string;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  response_status: number | null;
  response_body: string | null;
  created_at: string;
}

interface RequestLog {
  id: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number | null;
  error_code: string | null;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

const statusColor: Record<string, string> = {
  created: "bg-chip-gray-bg text-chip-gray-fg",
  pending: "bg-chip-yellow-bg text-chip-yellow-fg",
  paid: "bg-chip-green-bg text-chip-green-fg",
  settled: "bg-chip-blue-bg text-chip-blue-fg",
  failed: "bg-chip-red-bg text-chip-red-fg",
  expired: "bg-chip-orange-bg text-chip-orange-fg",
  cancelled: "bg-chip-gray-bg text-chip-gray-fg",
  active: "bg-chip-green-bg text-chip-green-fg",
  frozen: "bg-chip-red-bg text-chip-red-fg",
  disabled: "bg-chip-gray-bg text-chip-gray-fg",
  success: "bg-chip-green-bg text-chip-green-fg",
};

const methodColor: Record<string, string> = {
  GET: "bg-chip-green-bg text-chip-green-fg",
  POST: "bg-chip-blue-bg text-chip-blue-fg",
  PATCH: "bg-chip-yellow-bg text-chip-yellow-fg",
  DELETE: "bg-chip-red-bg text-chip-red-fg",
};

/* -------------------------------------------------------------------------- */
/*                              Intent Detail                                 */
/* -------------------------------------------------------------------------- */

function IntentDetail({
  intent,
  onClose,
}: {
  intent: PaymentIntent;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fields = [
    { label: "Intent ID", value: intent.id, mono: true, copyable: true },
    { label: "Amount", value: `${intent.amount} ${intent.token}` },
    { label: "Status", value: intent.status, badge: true },
    { label: "Description", value: intent.description || "—" },
    { label: "Payer", value: intent.payer_label || "—" },
    { label: "Vault Address", value: intent.vault_address || "—", mono: true, copyable: true },
    { label: "Commitment Hash", value: intent.commitment_hash || "—", mono: true, copyable: true },
    { label: "TX Hash", value: intent.tx_hash || "—", mono: true, copyable: !!intent.tx_hash },
    { label: "Paid At", value: intent.paid_at ? new Date(intent.paid_at).toLocaleString() : "—" },
    { label: "Settled At", value: intent.settled_at ? new Date(intent.settled_at).toLocaleString() : "—" },
    { label: "Expires At", value: new Date(intent.expires_at).toLocaleString() },
    { label: "Created", value: new Date(intent.created_at).toLocaleString() },
  ];

  const metaEntries = Object.entries(intent.metadata || {});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
    >
      <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-float)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-card/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <IconTile icon={CreditCard} size="sm" />
            <div>
              <h2 className="text-base font-semibold text-ink">Payment Intent</h2>
              <p className="text-xs text-muted">{intent.amount} {intent.token}</p>
            </div>
          </div>
          <button onClick={onClose} className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.label} className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-xs text-muted">{f.label}</span>
                <div className="min-w-0 flex-1 text-right">
                  {f.badge ? (
                    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-medium", statusColor[f.value as string] || statusColor.created)}>
                      {f.value as string}
                    </span>
                  ) : (
                    <span className={cn("text-sm text-ink", f.mono && "font-mono text-xs")}>
                      {f.value as string}
                    </span>
                  )}
                  {f.copyable && f.value !== "—" && (
                    <button onClick={() => copy(f.value as string)} className="ml-2 inline-flex text-muted hover:text-ink">
                      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {metaEntries.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">Metadata</p>
              <div className="rounded-lg bg-subtle p-3">
                {metaEntries.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 py-1">
                    <span className="text-xs text-muted">{k}</span>
                    <span className="font-mono text-xs text-ink">{JSON.stringify(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Tab Components                                 */
/* -------------------------------------------------------------------------- */

type Tab = "intents" | "payouts" | "webhooks" | "wallets" | "deliveries" | "logs";

function TabBar({ active, onChange, counts }: { active: Tab; onChange: (t: Tab) => void; counts: Record<Tab, number> }) {
  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: "intents", label: "Intents", icon: CreditCard },
    { key: "payouts", label: "Payouts", icon: CreditCard },
    { key: "webhooks", label: "Webhooks", icon: Webhook },
    { key: "wallets", label: "Wallets", icon: Key },
    { key: "deliveries", label: "Deliveries", icon: Server },
    { key: "logs", label: "Logs", icon: Activity },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-subtle p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            active === t.key
              ? "bg-card text-ink shadow-[var(--shadow-xs)]"
              : "text-muted hover:text-ink",
          )}
        >
          <t.icon className="size-3.5" />
          {t.label}
          {counts[t.key] > 0 && (
            <span className="ml-0.5 rounded-full bg-muted-bg px-1.5 py-0.5 text-[10px] tabular-nums">
              {counts[t.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Page                                    */
/* -------------------------------------------------------------------------- */

export default function MerchantPage() {
  const { user, wallet } = useAuth();
  const { toast } = useToast();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [wallets, setWallets] = useState<ManagedWallet[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("intents");
  const [selectedIntent, setSelectedIntent] = useState<PaymentIntent | null>(null);
  const [editingMerchant, setEditingMerchant] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [settlingIntent, setSettlingIntent] = useState<string | null>(null);
  const [payoutFilter, setPayoutFilter] = useState<"pending" | "settled" | "all">("pending");
  const [claimableTransfers, setClaimableTransfers] = useState<ProtectedDeposit[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [loadingClaimable, setLoadingClaimable] = useState(false);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { ensureMonadTestnet } = useMonadNetwork();

  const supabase = createClient();

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const meRes = await fetch("/api/gateway/merchants/me");
      const meJson = await meRes.json().catch(() => ({ ok: false }));
      const merchantData = meJson.ok ? (meJson.data as Merchant) : null;

      if (merchantData) {
        setMerchant(merchantData);

        const [intentsRes, webhooksRes, walletsRes] = await Promise.all([
          supabase
            .from("payment_intents")
            .select("*")
            .eq("merchant_id", merchantData.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("webhook_endpoints")
            .select("*")
            .eq("merchant_id", merchantData.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("managed_wallets")
            .select("*")
            .eq("merchant_id", merchantData.id)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        setIntents((intentsRes.data || []) as PaymentIntent[]);
        setWebhooks((webhooksRes.data || []) as WebhookEndpoint[]);
        setWallets((walletsRes.data || []) as ManagedWallet[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadDeliveries() {
    if (!merchant) return;
    setLoadingLogs(true);
    try {
      const { data } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setDeliveries((data || []) as WebhookDelivery[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function loadRequestLogs() {
    if (!merchant) return;
    setLoadingLogs(true);
    try {
      const { data } = await supabase
        .from("api_request_logs")
        .select("*")
        .eq("merchant_id", merchant.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setRequestLogs((data || []) as RequestLog[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function loadClaimable() {
    if (!wallet) return;
    setLoadingClaimable(true);
    try {
      const claims = await listClaimableForWallet(wallet);
      setClaimableTransfers(claims);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClaimable(false);
    }
  }

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
      await loadClaimable();
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
    if (!claimableTransfers.length) return;
    if (!walletClient || !publicClient || !wallet) {
      toast({ title: "Connect wallet", tone: "error" });
      return;
    }
    setClaimingAll(true);
    let ok = 0;
    let fail = 0;
    try {
      await ensureMonadTestnet();
      for (const deposit of claimableTransfers) {
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
      await loadClaimable();
    } finally {
      setClaimingAll(false);
    }
  }

  useEffect(() => {
    if (activeTab === "deliveries") void loadDeliveries();
    if (activeTab === "logs") void loadRequestLogs();
    if (activeTab === "payouts") void loadClaimable();
  }, [activeTab, merchant]);

  async function handleCreateMerchant() {
    if (!user) return;
    const name = user.display_name || user.username || "My App";
    const email = `${user.username}@anonym.local`;

    try {
      const res = await fetch("/api/gateway/merchants/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const json = await res.json().catch(() => ({ ok: false }));

      if (!json.ok) {
        toast({ title: "Error", description: json.error || "Could not create merchant", tone: "error" });
        return;
      }

      // Surface the API key once, at creation time.
      if (json.data?.api_key) setShowNewKey(json.data.api_key);
      toast({ title: "Merchant account created", tone: "success" });
      await load();
    } catch {
      toast({ title: "Error", description: "Network error", tone: "error" });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRotateKey() {
    if (!merchant) return;
    setRotating(true);
    try {
      const res = await fetch("/api/gateway/merchants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotate_key: true }),
      });
      const json = await res.json();
      if (json.ok && json.data?.api_key) {
        setShowNewKey(json.data.api_key);
        toast({ title: "API key rotated", tone: "success" });
        await load();
      } else {
        toast({ title: "Error", description: json.error || "Rotation failed", tone: "error" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", tone: "error" });
    } finally {
      setRotating(false);
      setShowRotateConfirm(false);
    }
  }

  function startEditProfile() {
    if (!merchant) return;
    setEditName(merchant.name);
    setEditEmail(merchant.email);
    setEditingMerchant(true);
  }

  async function saveProfile() {
    if (!merchant) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/gateway/merchants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, email: editEmail }),
      });
      const json = await res.json().catch(() => ({ ok: false }));

      if (!json.ok) {
        toast({ title: "Error", description: json.error || "Update failed", tone: "error" });
      } else {
        toast({ title: "Profile updated", tone: "success" });
        setEditingMerchant(false);
        await load();
      }
    } catch {
      toast({ title: "Error", description: "Network error", tone: "error" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCreateWebhook() {
    if (!merchant || !newWebhookUrl) return;
    setCreatingWebhook(true);
    try {
      const res = await fetch("/api/gateway/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newWebhookUrl }),
      });
      const json = await res.json().catch(() => ({ ok: false }));

      if (!json.ok) {
        toast({ title: "Error", description: json.error || "Could not create webhook", tone: "error" });
      } else {
        toast({ title: "Webhook created", tone: "success" });
        setNewWebhookUrl("");
        await load();
      }
    } catch {
      toast({ title: "Error", description: "Network error", tone: "error" });
    } finally {
      setCreatingWebhook(false);
    }
  }

  async function handleDeleteWebhook(id: string) {
    try {
      const res = await fetch(`/api/gateway/webhooks/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({ ok: false }));

      if (!json.ok) {
        toast({ title: "Error", description: json.error || "Could not remove webhook", tone: "error" });
      } else {
        toast({ title: "Webhook removed", tone: "success" });
        await load();
      }
    } catch {
      toast({ title: "Error", description: "Network error", tone: "error" });
    }
  }

  async function handleSettleIntent(intentId: string) {
    setSettlingIntent(intentId);
    try {
      const res = await fetch("/api/gateway/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent_id: intentId }),
      });
      const json = await res.json().catch(() => ({ ok: false }));

      if (!json.ok) {
        toast({ title: "Error", description: json.error || "Could not settle intent", tone: "error" });
      } else {
        toast({ title: "Intent settled", tone: "success" });
        await load();
      }
    } catch {
      toast({ title: "Error", description: "Network error", tone: "error" });
    } finally {
      setSettlingIntent(null);
    }
  }

  const filteredIntents = intentFilter === "all"
    ? intents
    : intents.filter((i) => i.status === intentFilter);

  const paidCount = intents.filter((i) => i.status === "paid" || i.status === "settled").length;
  const revenue = intents
    .filter((i) => i.status === "paid" || i.status === "settled")
    .reduce((a, i) => a + Number(i.amount), 0);

  const stats: {
    label: string;
    value: string;
    hint: string;
    icon: LucideIcon;
  }[] = [
    {
      label: "Total intents",
      value: String(intents.length),
      hint: `${paidCount} paid`,
      icon: CreditCard,
    },
    {
      label: "Revenue",
      value: revenue.toFixed(2),
      hint: "MON settled",
      icon: Activity,
    },
    {
      label: "Webhooks",
      value: String(webhooks.length),
      hint: `${webhooks.filter((w) => w.status === "active").length} active`,
      icon: Webhook,
    },
    {
      label: "Wallets",
      value: String(wallets.length),
      hint: "Managed",
      icon: Key,
    },
  ];

  const tabCounts: Record<Tab, number> = {
    intents: intents.length,
    payouts: intents.filter((i) => i.status === "paid" || i.status === "settled").length,
    webhooks: webhooks.length,
    wallets: wallets.length,
    deliveries: deliveries.length,
    logs: requestLogs.length,
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-5 md:p-8">
        <Skeleton className="h-20 w-full rounded-[var(--radius-card)]" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-72 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-5 md:p-8">
        <EmptyState
          icon={Key}
          title="No merchant account"
          description="Create a merchant account to start accepting anonymous crypto payments via the API."
          action={
            <Button onClick={handleCreateMerchant}>
              <Plus className="size-4" /> Create merchant account
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:space-y-6 sm:p-5 md:p-8">
      {/* Header */}
      <section className="rounded-[var(--radius-card)] border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <IconTile icon={Key} size="lg" />
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1 px-2 py-0.5 text-[11px]">
                  <Shield className="size-3 text-muted" strokeWidth={1.75} />
                  Merchant
                </Badge>
                <Badge variant="green" className="text-[11px]">
                  {merchant.status}
                </Badge>
              </div>
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {merchant.name}
              </h1>
              <p className="mt-0.5 truncate text-sm text-muted">
                API Gateway · Monad Testnet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={startEditProfile}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href="/docs" target="_blank">
                <ExternalLink className="size-3.5" /> Docs
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section>
        <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-faint">
          Overview
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
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
              </p>
              <p className="mt-1 truncate text-[11px] text-faint">{stat.hint}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* API Key */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <Card elevated className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              <IconTile icon={Key} size="sm" />
              <div>
                <CardTitle className="text-base">API Key</CardTitle>
                <CardDescription className="text-xs">
                  Use in <code>Authorization: Bearer</code> header
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={rotating}
              onClick={() => setShowRotateConfirm(true)}
            >
              {rotating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Rotate
            </Button>
          </div>
          <div className="p-4 sm:p-5">
            {showNewKey && (
              <div className="mb-4 rounded-[var(--radius-panel)] border border-chip-green-bg bg-chip-green-bg/30 p-4">
                <p className="mb-2 text-xs font-medium text-chip-green-fg">
                  New API key (shown once, store it now):
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg bg-card px-3 py-2 font-mono text-xs text-ink">
                    {showNewKey}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyToClipboard(showNewKey)}
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setShowNewKey(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 rounded-lg border border-line bg-subtle px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-faint">
                  Key prefix
                </p>
                <p className="mt-0.5 font-mono text-sm text-ink">
                  {showKey ? `sk_live_...${merchant.api_key_prefix}` : "••••••••••••"}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copyToClipboard(`sk_live_${merchant.api_key_prefix}...`)}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted">
              API keys are stored as SHA-256 hashes. If lost, rotate to generate
              a new one.{" "}
              <a href="/docs#authentication" className="text-ink underline">
                Learn more
              </a>
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} counts={tabCounts} />

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "intents" && (
          <motion.div key="intents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card elevated className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <IconTile icon={CreditCard} size="sm" />
                  <div>
                    <CardTitle className="text-base">Payment Intents</CardTitle>
                    <CardDescription className="text-xs">Click an intent for details</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={intentFilter}
                    onChange={(e) => setIntentFilter(e.target.value)}
                    className="rounded-lg border border-line bg-subtle px-2 py-1 text-xs text-ink focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="created">Created</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="settled">Settled</option>
                    <option value="failed">Failed</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <Badge variant="muted" className="text-[11px]">
                    {filteredIntents.length}
                  </Badge>
                </div>
              </div>
              <div className="px-4 py-1 sm:px-5">
                {filteredIntents.length === 0 ? (
                  <EmptyState
                    icon={CreditCard}
                    title="No payments yet"
                    description="Create your first payment intent via the API."
                    className="border-0 py-10"
                  />
                ) : (
                  <ul>
                    {filteredIntents.slice(0, 20).map((intent, i) => (
                      <li
                        key={intent.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-3 py-3 transition-colors hover:bg-subtle/50 -mx-2 px-2 rounded-lg",
                          i < Math.min(filteredIntents.length, 20) - 1 && "border-b border-line/80",
                        )}
                        onClick={() => setSelectedIntent(intent)}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium tabular-nums">
                            {intent.amount} {intent.token}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {intent.description || intent.payer_label || shortAddress(intent.id, 8)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              statusColor[intent.status] || "bg-chip-gray-bg text-chip-gray-fg",
                            )}
                          >
                            {intent.status}
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-faint">
                            {timeAgo(intent.created_at)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === "payouts" && (
          <motion.div key="payouts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {/* Claimable Transfers */}
            {claimableTransfers.length > 0 && (
              <Card elevated className="!p-0 overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-2.5">
                    <IconTile icon={Inbox} size="sm" />
                    <div>
                      <CardTitle className="text-base">Ready to Claim</CardTitle>
                      <CardDescription className="text-xs">
                        {claimableTransfers.length} protected transfer{claimableTransfers.length === 1 ? "" : "s"} in TransferVault
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={claimingAll}
                    onClick={() => void claimAll()}
                  >
                    {claimingAll ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Wallet className="size-3.5" />
                    )}
                    Claim all
                  </Button>
                </div>
                <ul className="divide-y divide-line">
                  {claimableTransfers.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium tabular-nums">
                          {formatMon(d.amount)} MON
                        </p>
                        <p className="text-xs text-muted">
                          {d.message || shortAddress(d.id, 8)} · {timeAgo(d.created_at)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={claimingId === d.id || claimingAll}
                        onClick={() => void claimOne(d)}
                      >
                        {claimingId === d.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Claim"
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Settle Intent Section */}
            <Card elevated className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <IconTile icon={CreditCard} size="sm" />
                  <div>
                    <CardTitle className="text-base">Settle Intents</CardTitle>
                    <CardDescription className="text-xs">Mark paid intents as settled to your wallet</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={payoutFilter}
                    onChange={(e) => setPayoutFilter(e.target.value as "pending" | "settled" | "all")}
                    className="rounded-lg border border-line bg-subtle px-2 py-1 text-xs text-ink focus:outline-none"
                  >
                    <option value="pending">Ready to settle</option>
                    <option value="settled">Settled</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                {/* Payout Stats */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-line bg-subtle p-3">
                    <p className="text-[10px] uppercase tracking-wide text-faint">Pending</p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {intents.filter((i) => i.status === "paid").reduce((a, i) => a + Number(i.amount), 0).toFixed(2)} MON
                    </p>
                    <p className="text-[11px] text-faint">{intents.filter((i) => i.status === "paid").length} intents</p>
                  </div>
                  <div className="rounded-xl border border-line bg-subtle p-3">
                    <p className="text-[10px] uppercase tracking-wide text-faint">Settled</p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {intents.filter((i) => i.status === "settled").reduce((a, i) => a + Number(i.amount), 0).toFixed(2)} MON
                    </p>
                    <p className="text-[11px] text-faint">{intents.filter((i) => i.status === "settled").length} intents</p>
                  </div>
                  <div className="rounded-xl border border-line bg-subtle p-3">
                    <p className="text-[10px] uppercase tracking-wide text-faint">Total</p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {intents.filter((i) => i.status === "paid" || i.status === "settled").reduce((a, i) => a + Number(i.amount), 0).toFixed(2)} MON
                    </p>
                    <p className="text-[11px] text-faint">All time</p>
                  </div>
                </div>

                {/* Payout Intents List */}
                {(() => {
                  const filteredPayouts = payoutFilter === "all"
                    ? intents.filter((i) => i.status === "paid" || i.status === "settled")
                    : intents.filter((i) => i.status === payoutFilter);

                  return filteredPayouts.length === 0 ? (
                    <EmptyState
                      icon={CreditCard}
                      title={payoutFilter === "pending" ? "No pending settlements" : "No settled intents"}
                      description={payoutFilter === "pending" ? "Paid intents will appear here ready for settlement." : "Settled intents will appear here."}
                      className="border-0 py-10"
                    />
                  ) : (
                    <ul className="space-y-2">
                      {filteredPayouts.map((intent) => (
                        <li
                          key={intent.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-line bg-subtle px-3 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium tabular-nums">
                                {intent.amount} {intent.token}
                              </p>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  intent.status === "settled" ? "bg-chip-blue-bg text-chip-blue-fg" : "bg-chip-green-bg text-chip-green-fg",
                                )}
                              >
                                {intent.status}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {intent.description || intent.payer_label || shortAddress(intent.id, 8)}
                              {intent.tx_hash && (
                                <span className="ml-2 font-mono text-faint">
                                  tx: {shortAddress(intent.tx_hash, 6)}
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-[11px] text-faint">
                              {intent.paid_at ? `Paid ${timeAgo(intent.paid_at)}` : "Not yet paid"}
                              {intent.settled_at && ` · Settled ${timeAgo(intent.settled_at)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {intent.status === "paid" ? (
                              <Button
                                size="sm"
                                disabled={settlingIntent === intent.id}
                                onClick={() => void handleSettleIntent(intent.id)}
                              >
                                {settlingIntent === intent.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Check className="size-3.5" />
                                )}
                                Settle
                              </Button>
                            ) : (
                              <span className="text-xs text-faint">
                                {intent.settled_at ? new Date(intent.settled_at).toLocaleDateString() : "—"}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === "webhooks" && (
          <motion.div key="webhooks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card elevated className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <IconTile icon={Webhook} size="sm" />
                  <div>
                    <CardTitle className="text-base">Webhooks</CardTitle>
                    <CardDescription className="text-xs">Payment event endpoints</CardDescription>
                  </div>
                </div>
                <Badge variant="muted" className="text-[11px]">{webhooks.length}</Badge>
              </div>
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex gap-2">
                  <input
                    type="url"
                    placeholder="https://your-app.com/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    className="flex-1 rounded-lg border border-line bg-subtle px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                  <Button
                    size="sm"
                    disabled={!newWebhookUrl || creatingWebhook}
                    onClick={() => void handleCreateWebhook()}
                  >
                    {creatingWebhook ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Add
                  </Button>
                </div>
                {webhooks.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">
                    No webhook endpoints configured.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {webhooks.map((wh) => (
                      <li
                        key={wh.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-line bg-subtle px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{wh.url}</p>
                          <p className="mt-0.5 text-[11px] text-muted">
                            {wh.events.length} event{wh.events.length !== 1 ? "s" : ""} ·{" "}
                            <span
                              className={cn(
                                "font-medium",
                                wh.status === "active" ? "text-chip-green-fg" : "text-chip-red-fg",
                              )}
                            >
                              {wh.status}
                            </span>
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => void handleDeleteWebhook(wh.id)}
                        >
                          <Trash2 className="size-3.5 text-muted" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === "wallets" && (
          <motion.div key="wallets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card elevated className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <IconTile icon={Key} size="sm" />
                  <div>
                    <CardTitle className="text-base">Managed Wallets</CardTitle>
                    <CardDescription className="text-xs">Deterministic wallets for walletless users</CardDescription>
                  </div>
                </div>
                <Badge variant="muted" className="text-[11px]">{wallets.length}</Badge>
              </div>
              <div className="px-4 py-1 sm:px-5">
                {wallets.length === 0 ? (
                  <EmptyState
                    icon={Key}
                    title="No managed wallets"
                    description="Create wallets via the API for users without crypto wallets."
                    className="border-0 py-10"
                  />
                ) : (
                  <ul>
                    {wallets.map((w, i) => (
                      <li
                        key={w.id}
                        className={cn(
                          "flex items-center justify-between gap-3 py-3",
                          i < wallets.length - 1 && "border-b border-line/80",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm text-ink">
                            {shortAddress(w.address, 8)}
                          </p>
                          <p className="text-xs text-muted">
                            {w.label || w.user_identifier || `Index #${w.derivation_index}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              statusColor[w.status] || "bg-chip-gray-bg text-chip-gray-fg",
                            )}
                          >
                            {w.status}
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-faint">
                            {timeAgo(w.created_at)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === "deliveries" && (
          <motion.div key="deliveries" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card elevated className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <IconTile icon={Server} size="sm" />
                  <div>
                    <CardTitle className="text-base">Webhook Deliveries</CardTitle>
                    <CardDescription className="text-xs">Recent delivery attempts</CardDescription>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void loadDeliveries()} disabled={loadingLogs}>
                  <RefreshCw className={cn("size-3.5", loadingLogs && "animate-spin")} />
                </Button>
              </div>
              <div className="px-4 py-1 sm:px-5">
                {loadingLogs ? (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                  </div>
                ) : deliveries.length === 0 ? (
                  <EmptyState
                    icon={Server}
                    title="No deliveries yet"
                    description="Webhook deliveries will appear here when events are dispatched."
                    className="border-0 py-10"
                  />
                ) : (
                  <ul>
                    {deliveries.map((d, i) => (
                      <li
                        key={d.id}
                        className={cn(
                          "flex items-center justify-between gap-3 py-3",
                          i < deliveries.length - 1 && "border-b border-line/80",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", methodColor.POST)}>
                              {d.event_type}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                statusColor[d.status] || "bg-chip-gray-bg text-chip-gray-fg",
                              )}
                            >
                              {d.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {d.response_status ? `HTTP ${d.response_status}` : "No response"} · {d.attempts} attempt{d.attempts !== 1 ? "s" : ""}
                            {d.last_attempt_at && ` · ${timeAgo(d.last_attempt_at)}`}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === "logs" && (
          <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card elevated className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <IconTile icon={Activity} size="sm" />
                  <div>
                    <CardTitle className="text-base">API Request Logs</CardTitle>
                    <CardDescription className="text-xs">Recent Gateway API requests</CardDescription>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void loadRequestLogs()} disabled={loadingLogs}>
                  <RefreshCw className={cn("size-3.5", loadingLogs && "animate-spin")} />
                </Button>
              </div>
              <div className="px-4 py-1 sm:px-5">
                {loadingLogs ? (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                  </div>
                ) : requestLogs.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No request logs yet"
                    description="API request logs will appear here as you use the Gateway API."
                    className="border-0 py-10"
                  />
                ) : (
                  <ul>
                    {requestLogs.map((log, i) => (
                      <li
                        key={log.id}
                        className={cn(
                          "flex items-center justify-between gap-3 py-3",
                          i < requestLogs.length - 1 && "border-b border-line/80",
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", methodColor[log.method] || "bg-chip-gray-bg text-chip-gray-fg")}>
                            {log.method}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm text-ink">{log.endpoint}</p>
                            <p className="text-xs text-muted">
                              {timeAgo(log.created_at)}
                              {log.response_time_ms != null && ` · ${log.response_time_ms}ms`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              log.status_code < 400
                                ? "bg-chip-green-bg text-chip-green-fg"
                                : "bg-chip-red-bg text-chip-red-fg",
                            )}
                          >
                            {log.status_code}
                          </span>
                          {log.error_code && (
                            <span className="text-[10px] text-chip-red-fg">{log.error_code}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intent Detail Modal */}
      <AnimatePresence>
        {selectedIntent && (
          <IntentDetail intent={selectedIntent} onClose={() => setSelectedIntent(null)} />
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editingMerchant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          >
            <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]" onClick={() => setEditingMerchant(false)} />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative z-10 w-full max-w-md rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-float)]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-ink">Edit Merchant Profile</h2>
                <button onClick={() => setEditingMerchant(false)} className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink">
                  <X className="size-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Merchant name" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Email</label>
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" placeholder="email@example.com" />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditingMerchant(false)}>Cancel</Button>
                <Button disabled={savingProfile || !editName || !editEmail} onClick={() => void saveProfile()}>
                  {savingProfile ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rotate Key Confirmation */}
      <ConfirmDialog
        open={showRotateConfirm}
        title="Rotate API key?"
        description="Your current API key will be immediately revoked. Any integrations using it will stop working until you update them with the new key."
        confirmLabel="Rotate key"
        tone="danger"
        loading={rotating}
        onConfirm={() => void handleRotateKey()}
        onCancel={() => setShowRotateConfirm(false)}
      />
    </div>
  );
}
