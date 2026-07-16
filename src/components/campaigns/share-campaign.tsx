"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/services/data/types";

export function campaignShareUrl(campaignId: string) {
  if (typeof window === "undefined") return `/app/campaigns/${campaignId}`;
  return `${window.location.origin}/app/campaigns/${campaignId}`;
}

type ShareCampaignProps = {
  campaign: Pick<Campaign, "id" | "title" | "visibility">;
  /** compact icon buttons vs full bar */
  variant?: "bar" | "menu" | "icon";
  className?: string;
};

/** Copy / native-share controls for a campaign link. */
export function ShareCampaign({
  campaign,
  variant = "bar",
  className,
}: ShareCampaignProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => campaignShareUrl(campaign.id), [campaign.id]);

  async function copyLink(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link copied",
        description:
          campaign.visibility === "private"
            ? "Private link — only people with it can open (if signed in as needed)."
            : "Share this public campaign anywhere.",
        tone: "success",
      });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Copy failed", tone: "error" });
    }
  }

  async function nativeShare(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: campaign.title,
          text: `Support “${campaign.title}” on Anonym`,
          url,
        });
        return;
      } catch {
        /* user cancelled - fall through to copy */
      }
    }
    await copyLink();
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={(e) => void copyLink(e)}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full border border-line bg-card text-muted transition-colors hover:bg-subtle hover:text-ink",
          className,
        )}
        aria-label="Copy campaign link"
        title="Copy share link"
      >
        {copied ? (
          <Check className="size-3.5 text-chip-green-fg" />
        ) : (
          <Link2 className="size-3.5" />
        )}
      </button>
    );
  }

  if (variant === "menu") {
    return (
      <div className={cn("flex gap-2", className)}>
        <Button size="sm" variant="secondary" onClick={() => void copyLink()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          Copy link
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void nativeShare()}>
          <Share2 className="size-4" />
          Share
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-panel)] border border-line bg-subtle/80 p-3 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted">
          {campaign.visibility === "private" ? "Private share link" : "Public share link"}
        </p>
        <p className="truncate font-mono text-xs text-ink/80">{url}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="secondary" onClick={() => void copyLink()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" onClick={() => void nativeShare()}>
          <Share2 className="size-4" />
          Share
        </Button>
      </div>
    </div>
  );
}
