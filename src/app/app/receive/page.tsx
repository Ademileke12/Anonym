"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import {
  listClaimableForWallet,
  listPendingLocksForWallet,
  type ProtectedDeposit,
} from "@/services/protocol/ledger";
import { buildPayDeepLink } from "@/lib/claim-link";
import {
  createPaymentRequest,
  listMyPaymentRequests,
} from "@/services/data/payment-requests";
import type { PaymentRequest } from "@/services/data/send-types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Check, Copy, Shield, Inbox, QrCode, Clock } from "lucide-react";
import { formatMon } from "@/lib/format";
import { PayQr } from "@/components/ui/pay-qr";

/**
 * Receive — profile + QR deep link + claimable count.
 */
export default function ReceivePage() {
  const { user, wallet } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [claimable, setClaimable] = useState<ProtectedDeposit[]>([]);
  const [locked, setLocked] = useState<ProtectedDeposit[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [reqAmount, setReqAmount] = useState("10");
  const [payAmount, setPayAmount] = useState("");

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const profileUrl = useMemo(() => {
    if (!user?.username || !origin) return "";
    return `${origin}/anonym/@${user.username}`;
  }, [user?.username, origin]);

  const payUrl = useMemo(() => {
    if (!user?.username || !origin) return "";
    return buildPayDeepLink({
      to: user.username,
      amount: payAmount.trim() || undefined,
      origin,
    });
  }, [user?.username, payAmount, origin]);

  useEffect(() => {
    if (!wallet) return;
    void listClaimableForWallet(wallet)
      .then(setClaimable)
      .catch(console.error);
    void listPendingLocksForWallet(wallet)
      .then(setLocked)
      .catch(() => setLocked([]));
    void listMyPaymentRequests(wallet)
      .then(setRequests)
      .catch(() => setRequests([]));
  }, [wallet]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: `${label} copied`, tone: "success" });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", tone: "error" });
    }
  }

  async function quickRequest() {
    if (!wallet || !user) return;
    const n = Number(reqAmount);
    if (!Number.isFinite(n) || n <= 0) {
      toast({ title: "Enter amount", tone: "error" });
      return;
    }
    try {
      const req = await createPaymentRequest({
        requester_user_id: user.id,
        requester_wallet: wallet,
        requester_username: user.username,
        amount: n,
      });
      const url = `${window.location.origin}/app/transfer?request=${req.id}`;
      await copy(url, "Pay link");
      setRequests((r) => [req, ...r]);
    } catch (e) {
      toast({
        title: "Could not create request",
        description:
          e instanceof Error
            ? e.message
            : "Apply migration 07_send_suite.sql",
        tone: "error",
      });
    }
  }

  const pendingTotal = claimable.reduce((a, d) => a + Number(d.amount), 0);

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 sm:p-5 md:p-8">
      <div>
        <Badge variant="outline" className="mb-2 gap-1.5">
          <Shield className="size-3" />
          Protected by Anonym
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">Receive</h1>
        <p className="mt-1 text-muted">
          Share @username, QR, or a pay request. No public wallet on your
          profile.
        </p>
      </div>

      <Card elevated className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-line bg-subtle text-muted">
          <QrCode className="size-6" strokeWidth={1.75} />
        </div>
        <CardHeader className="items-center text-center">
          <CardTitle>
            {user?.username ? `@${user.username}` : "Complete onboarding"}
          </CardTitle>
          <CardDescription>Scan to open protected send</CardDescription>
        </CardHeader>
        {user?.username ? (
          <PayQr value={payUrl} size={176} alt={`Pay @${user.username}`} />
        ) : (
          <div className="mx-auto flex size-44 items-center justify-center rounded-xl border border-line bg-subtle px-4 text-center text-xs text-muted">
            Finish onboarding to get a pay QR
          </div>
        )}
        <div className="mx-auto mt-4 w-full max-w-xs text-left">
          <Label htmlFor="payAmt">Suggested amount (optional)</Label>
          <Input
            id="payAmt"
            type="number"
            min="0"
            step="any"
            placeholder="Any amount"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            onClick={() => void copy(payUrl, "Pay link")}
            disabled={!payUrl}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            Copy pay link
          </Button>
          <Button
            variant="secondary"
            onClick={() => void copy(profileUrl, "Profile")}
            disabled={!profileUrl}
          >
            Copy profile
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Request payment</h2>
        <p className="text-sm text-muted">
          Create a link so someone can pay you into the vault.
        </p>
        <div>
          <Label htmlFor="ra">Amount (MON)</Label>
          <Input
            id="ra"
            type="number"
            value={reqAmount}
            onChange={(e) => setReqAmount(e.target.value)}
          />
        </div>
        <Button className="w-full" variant="secondary" onClick={() => void quickRequest()}>
          Create pay request
        </Button>
        {requests.filter((r) => r.status === "open").length > 0 ? (
          <ul className="divide-y divide-line border-t border-line pt-2 text-sm">
            {requests
              .filter((r) => r.status === "open")
              .slice(0, 5)
              .map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span className="tabular-nums">
                    {formatMon(r.amount)} MON · {r.status}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void copy(
                        `${window.location.origin}/app/transfer?request=${r.id}`,
                        "Link",
                      )
                    }
                  >
                    Copy
                  </Button>
                </li>
              ))}
          </ul>
        ) : null}
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-subtle text-muted">
            <Inbox className="size-4" strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <p className="font-semibold">
              {claimable.length} claimable transfer
              {claimable.length === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {claimable.length
                ? `${formatMon(pendingTotal)} MON ready`
                : "Claims appear when someone sends you a protected deposit."}
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/app">Claim on dashboard</Link>
            </Button>
          </div>
        </div>
      </Card>

      {locked.length > 0 ? (
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-subtle text-muted">
              <Clock className="size-4" strokeWidth={1.75} />
            </span>
            <div className="flex-1">
              <p className="font-semibold">
                {locked.length} locked (escrow / condition)
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Unlocks after the date or when the sender marks the condition
                done.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-muted">
                {locked.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex justify-between gap-2">
                    <span className="tabular-nums">
                      {formatMon(d.amount)} MON
                    </span>
                    <span className="truncate text-faint">
                      {d.unlock_at
                        ? `until ${new Date(d.unlock_at).toLocaleDateString()}`
                        : d.condition_type || "condition"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
