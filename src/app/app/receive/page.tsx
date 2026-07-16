"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import {
  listClaimableForWallet,
  type ProtectedDeposit,
} from "@/services/protocol/ledger";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Check, Copy, Shield, Inbox } from "lucide-react";
import { useEffect } from "react";
import { formatMon } from "@/lib/format";

/**
 * Receive - no public wallet exposure.
 * Users share @username / profile; funds arrive as protected claims.
 */
export default function ReceivePage() {
  const { user, wallet } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [claimable, setClaimable] = useState<ProtectedDeposit[]>([]);

  const profileUrl = useMemo(() => {
    if (!user?.username || typeof window === "undefined") return "";
    return `${window.location.origin}/anonym/@${user.username}`;
  }, [user?.username]);

  useEffect(() => {
    if (!wallet) return;
    void listClaimableForWallet(wallet)
      .then(setClaimable)
      .catch(console.error);
  }, [wallet]);

  async function copyProfile() {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({ title: "Profile link copied", tone: "success" });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", tone: "error" });
    }
  }

  const pendingTotal = claimable.reduce((a, d) => a + Number(d.amount), 0);

  return (
    <div className="mx-auto max-w-xl space-y-6 p-5 md:p-8">
      <div>
        <Badge variant="outline" className="mb-2 gap-1.5">
          <Shield className="size-3" />
          Protected by Anonym
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">Receive</h1>
        <p className="mt-1 text-muted">
          Share your profile, not a raw wallet. Incoming funds are protected
          deposits you claim from the dashboard.
        </p>
      </div>

      <Card elevated className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-line bg-subtle text-muted">
          <Shield className="size-6" strokeWidth={1.75} />
        </div>
        <CardHeader className="items-center text-center">
          <CardTitle>Verified recipient</CardTitle>
          <CardDescription>
            {user?.username ? `@${user.username}` : "Complete onboarding"}
          </CardDescription>
        </CardHeader>
        <p className="mx-auto max-w-sm text-sm text-muted">
          Others send to your username through the Anonym protocol. Your
          receiving wallet is never shown on your public profile.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button onClick={() => void copyProfile()} disabled={!profileUrl}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            Copy profile link
          </Button>
          {profileUrl ? (
            <p className="max-w-full truncate px-4 font-mono text-xs text-faint">
              {profileUrl}
            </p>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-subtle text-muted">
            <Inbox className="size-4" strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <p className="font-semibold">
              {claimable.length} protected transfer
              {claimable.length === 1 ? "" : "s"} available
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {claimable.length
                ? `${formatMon(pendingTotal)} MON ready to claim`
                : "When someone sends you a protected transfer, claim it here."}
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/app">Open dashboard to claim</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
