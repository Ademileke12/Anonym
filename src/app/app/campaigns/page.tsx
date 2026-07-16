"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listPublicCampaigns } from "@/services/data/campaigns";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { HeartHandshake } from "lucide-react";
import type { Campaign, User } from "@/services/data/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<
    (Campaign & { owner?: User | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listPublicCampaigns()
      .then((rows) => {
        if (!cancelled) setCampaigns(rows);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-5 md:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-muted">
            Public raises on Anonym. Only active campaigns show as Live.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/campaigns/new">Create campaign</Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Could not load campaigns" description={error} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="No campaigns yet"
          description="Be the first to launch a raise on Anonym."
          action={
            <Button asChild>
              <Link href="/app/campaigns/new">Create campaign</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              ownerName={
                c.owner?.display_name
                  ? c.owner.display_name
                  : c.owner
                    ? `@${c.owner.username}`
                    : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
