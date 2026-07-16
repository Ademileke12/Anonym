"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePublicClient, useWalletClient } from "wagmi";
import { useAuth } from "@/providers/auth-provider";
import { createCampaign } from "@/services/data/campaigns";
import { ensureCampaignVault } from "@/services/protocol/vaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/components/ui/toast";
import { CAMPAIGN_CATEGORIES } from "@/lib/format";
import { Shield } from "lucide-react";

export default function NewCampaignPage() {
  const { user, wallet } = useAuth();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<string>(CAMPAIGN_CATEGORIES[0]);
  const [goal, setGoal] = useState("1000");
  const [deadline, setDeadline] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [featuredUrl, setFeaturedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !goal || Number(goal) <= 0) {
      toast({ title: "Title and goal are required", tone: "error" });
      return;
    }
    const ownerWallet =
      user.monad_receiving_address || user.wallet_address || wallet || "";
    setSaving(true);
    try {
      const campaign = await createCampaign({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        reason: reason.trim() || null,
        category,
        goal_amount: Number(goal),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        // Internal only - never shown on public campaign / profile pages
        monad_receiving_address: ownerWallet,
        banner_image: bannerUrl,
        featured_image: featuredUrl,
        visibility,
        status: "active",
        protocol_mode: true,
      });

      // Register virtual or on-chain campaign vault (no direct donations to wallet)
      if (walletClient && publicClient && ownerWallet) {
        try {
          const vault = await ensureCampaignVault({
            clients: {
              walletClient,
              publicClient,
              account:
                walletClient.account ?? (ownerWallet as `0x${string}`),
            },
            campaignId: campaign.id,
            ownerWallet,
          });
          // Best-effort store vault on campaign row
          const { createClient } = await import(
            "@/services/supabase/client"
          );
          await createClient()
            .from("campaigns")
            .update({ vault_address: vault.address })
            .eq("id", campaign.id);
        } catch (vaultErr) {
          console.warn("Vault ensure deferred", vaultErr);
        }
      }

      toast({
        title: "Campaign live",
        description: "Protected by Anonym · vault-backed contributions",
        tone: "success",
      });
      router.push(`/app/campaigns/${campaign.id}`);
    } catch (err) {
      toast({
        title: "Create failed",
        description: err instanceof Error ? err.message : "Try again",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-5 md:p-8">
      <Badge variant="outline" className="mb-2 gap-1.5">
        <Shield className="size-3" />
        Protected by Anonym
      </Badge>
      <h1 className="text-2xl font-bold tracking-tight">Create campaign</h1>
      <p className="mt-1 text-muted">
        Contributions deposit to a campaign vault, not your public wallet.
      </p>

      <Card className="mt-8">
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          <ImageUpload
            bucket="banners"
            wallet={wallet || user?.wallet_address || ""}
            value={bannerUrl}
            onChange={setBannerUrl}
            label="Banner image"
            aspect="wide"
          />
          <ImageUpload
            bucket="banners"
            wallet={wallet || user?.wallet_address || ""}
            value={featuredUrl}
            onChange={setFeaturedUrl}
            label="Featured image"
            aspect="square"
          />
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cat">Category</Label>
              <select
                id="cat"
                className="flex h-11 w-full rounded-[var(--radius-input)] border border-line-strong bg-card px-3 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CAMPAIGN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="goal">Goal (MON)</Label>
              <Input
                id="goal"
                type="number"
                min="0"
                step="any"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <p className="rounded-xl border border-line bg-subtle px-3 py-2.5 text-xs text-muted">
            Owner vault control uses your connected wallet / profile receiving
            address internally. It is never shown on the public campaign page.
          </p>
          <div>
            <Label>Visibility</Label>
            <div className="mt-1 flex gap-2">
              {(["public", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`rounded-full border px-4 py-2 text-sm capitalize ${
                    visibility === v
                      ? "border-ink bg-inverse text-on-inverse"
                      : "border-line bg-card text-muted"
                  }`}
                >
                  {v === "private" ? "Private link" : "Public"}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Creating…" : "Publish campaign"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
