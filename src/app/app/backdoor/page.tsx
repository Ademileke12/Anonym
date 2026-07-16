"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useAuth } from "@/providers/auth-provider";
import { listIncomingDonations, listIncomingTransfers } from "@/services/data/transfers";
import { listProtectedActivity, type ProtectedDeposit } from "@/services/protocol/ledger";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatMon, shortAddress, timeAgo } from "@/lib/format";
import { Eye, Lock, Download, KeyRound, Loader2 } from "lucide-react";
import type { Donation, Transfer } from "@/services/data/types";

const BACKDOOR_CODE = "##OPE21#";

export default function BackdoorPage() {
  const { wallet } = useAuth();
  const { address } = useAccount();
  const { toast } = useToast();
  const sessionWallet = (wallet ?? address ?? "").toLowerCase();

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [incomingTransfers, setIncomingTransfers] = useState<Transfer[]>([]);
  const [incomingDonations, setIncomingDonations] = useState<Donation[]>([]);
  const [protectedRows, setProtectedRows] = useState<ProtectedDeposit[]>([]);
  const [nameByWallet, setNameByWallet] = useState<Map<string, string>>(
    new Map(),
  );

  const refresh = useCallback(async () => {
    if (!sessionWallet) return;
    const [txs, dons, prot] = await Promise.all([
      listIncomingTransfers(sessionWallet),
      listIncomingDonations(sessionWallet),
      listProtectedActivity(sessionWallet),
    ]);
    setIncomingTransfers(txs);
    setIncomingDonations(dons);
    setProtectedRows(prot);
    setDataReady(true);

    try {
      const { createClient } = await import("@/services/supabase/client");
      const supabase = createClient();
      const wallets = [
        ...new Set(
          prot
            .flatMap((d) => [d.sender_wallet, d.recipient_wallet])
            .filter(
              (w): w is string =>
                w != null && w.toLowerCase() !== sessionWallet,
            ),
        ),
      ];
      if (wallets.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("wallet_address, username, display_name")
          .in("wallet_address", wallets);
        const map = new Map<string, string>();
        for (const u of users ?? []) {
          map.set(
            u.wallet_address.toLowerCase(),
            u.username ? `@${u.username}` : u.display_name || "",
          );
        }
        setNameByWallet(map);
      }
    } catch {
      // best-effort
    }
  }, [sessionWallet]);

  useEffect(() => {
    void refresh()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refresh]);

  function submitCode() {
    if (code === BACKDOOR_CODE) {
      setCodeError(false);
      toast({ title: "Backdoor unlocked", tone: "success" });
    } else {
      setCodeError(true);
      toast({ title: "Invalid code", tone: "error" });
    }
  }

  function exportHistory() {
    const payload = {
      protected: protectedRows,
      transfers: incomingTransfers,
      donations: incomingDonations,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anonym-backdoor.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export downloaded", tone: "success" });
  }

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="mx-auto h-80 max-w-lg" />
      </div>
    );
  }

  if (code !== BACKDOOR_CODE) {
    return (
      <div className="mx-auto max-w-lg p-5 md:p-10">
        <Card elevated className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-line bg-subtle text-muted">
            <KeyRound className="size-6" strokeWidth={1.75} />
          </div>
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            <Badge variant="outline">Backdoor</Badge>
            <Badge variant="muted">Locked</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Backdoor</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            A controlled reveal of private payment details for your wallet -
            senders, amounts, notes, and campaign support that stay hidden on
            the public graph. Default app flows never expose this.
          </p>

          <div className="mt-8 space-y-3">
            <input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCode();
              }}
              placeholder="Enter access code"
              className={`w-full rounded-lg border bg-subtle px-4 py-3 text-sm text-ink placeholder:faint focus:outline-none focus:ring-2 ${
                codeError
                  ? "border-red-500 focus:ring-red-500/30"
                  : "border-line focus:ring-accent/30 focus:border-accent"
              }`}
            />
            <Button
              className="w-full"
              size="lg"
              onClick={submitCode}
              disabled={!code}
            >
              <Lock className="size-4" />
              Unlock
            </Button>
          </div>

          <p className="mt-3 text-xs text-faint">
            Enter the secret code to reveal your private activity.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">Open</Badge>
            <Badge variant="muted">Backdoor</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Backdoor</h1>
          <p className="mt-1 text-muted">
            Revealed private activity for your session wallet.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportHistory}>
          <Download className="size-4" /> Export
        </Button>
      </div>

      {dataReady ? (
        <>
          <Card>
            <h2 className="mb-4 font-semibold">Protected protocol deposits</h2>
            {protectedRows.length === 0 ? (
              <EmptyState
                title="No protected deposits yet"
                description="Vault transfers and campaign contributions involving you appear here."
                className="border-0 py-8"
              />
            ) : (
              <ul className="divide-y divide-line">
                {protectedRows.map((d) => {
                  const out =
                    d.sender_wallet?.toLowerCase() === sessionWallet;
                  return (
                    <li key={d.id} className="py-3 first:pt-0">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-medium">
                          {out ? "Out" : "In"} · {formatMon(d.amount)}{" "}
                          {d.token} · {d.kind}
                        </p>
                        <span className="text-xs text-faint">
                          {timeAgo(d.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {out
                          ? `to ${nameByWallet.get(d.recipient_wallet?.toLowerCase()) || shortAddress(d.recipient_wallet)}`
                          : `from ${nameByWallet.get(d.sender_wallet?.toLowerCase() ?? "") || shortAddress(d.sender_wallet)}`}
                        {" · "}
                        {d.status}
                        {d.message ? ` · "${d.message}"` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-semibold">Legacy incoming transfers</h2>
              {incomingTransfers.length === 0 ? (
                <EmptyState
                  title="None"
                  description="Pre-protocol transfer rows to you."
                  className="border-0 py-8"
                />
              ) : (
                <ul className="divide-y divide-line">
                  {incomingTransfers.map((t) => (
                    <li key={t.id} className="py-3 first:pt-0">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-medium">
                          {formatMon(t.amount)} {t.token}
                        </p>
                        <span className="text-xs text-faint">
                          {timeAgo(t.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        from {shortAddress(t.sender_wallet)}
                        {t.note ? ` · "${t.note}"` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-4 font-semibold">Legacy campaign donations</h2>
              {incomingDonations.length === 0 ? (
                <EmptyState
                  title="None"
                  description="Pre-protocol donation rows to your campaigns."
                  className="border-0 py-8"
                />
              ) : (
                <ul className="divide-y divide-line">
                  {incomingDonations.map((d) => (
                    <li key={d.id} className="py-3 first:pt-0">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-medium">
                          {formatMon(d.amount)} MON
                        </p>
                        <span className="text-xs text-faint">
                          {timeAgo(d.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {d.anonymous
                          ? "Anonymous"
                          : shortAddress(d.sender_wallet)}
                        {d.message ? ` · "${d.message}"` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <div className="flex items-center gap-3 py-4 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Loading activity…
          </div>
        </Card>
      )}
    </div>
  );
}
