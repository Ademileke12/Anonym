"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShareCampaign } from "@/components/campaigns/share-campaign";
import { formatMon } from "@/lib/format";
import { useCountdown } from "@/hooks/use-countdown";
import type { Campaign } from "@/services/data/types";

export function CampaignCard({
  campaign,
  ownerName,
}: {
  campaign: Campaign;
  ownerName?: string;
}) {
  const cd = useCountdown(campaign.deadline);
  const pct =
    Number(campaign.goal_amount) > 0
      ? (Number(campaign.amount_raised) / Number(campaign.goal_amount)) * 100
      : 0;

  return (
    <Card
      padded={false}
      className="group h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
    >
      <Link href={`/app/campaigns/${campaign.id}`} className="block">
        <div className="relative h-32 bg-gradient-to-br from-subtle via-muted-bg to-chip-blue-bg/30">
          {campaign.banner_image || campaign.featured_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.banner_image || campaign.featured_image || ""}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-1.5">
            <Badge variant="outline" className="bg-card/90 backdrop-blur-sm">
              {campaign.status === "active" && !cd?.expired
                ? "Live"
                : campaign.status === "active" && cd?.expired
                  ? "Ended"
                  : campaign.status === "ended"
                    ? "Ended"
                    : campaign.status === "completed"
                      ? "Completed"
                      : campaign.status}
            </Badge>
            {campaign.visibility === "private" ? (
              <Badge variant="outline">Private</Badge>
            ) : null}
          </div>
        </div>
      </Link>
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/app/campaigns/${campaign.id}`}
              className="font-semibold tracking-tight hover:underline"
            >
              {campaign.title}
            </Link>
            {ownerName ? (
              <p className="mt-0.5 text-xs text-muted">by {ownerName}</p>
            ) : null}
          </div>
          <ShareCampaign campaign={campaign} variant="icon" />
        </div>
        <p className="line-clamp-2 text-sm text-muted">
          {campaign.description ?? "No description"}
        </p>
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-muted">
            <span>{formatMon(campaign.amount_raised)} MON raised</span>
            <span className="font-medium tabular-nums">
              {Math.round(pct)}%
            </span>
          </div>
          <Progress value={pct} />
          <div className="mt-2 flex justify-between text-xs text-faint">
            <span>Goal {formatMon(campaign.goal_amount)} MON</span>
            {cd ? (
              <span>
                {cd.expired
                  ? "Ended"
                  : `${cd.days}d ${cd.hours}h ${cd.minutes}m left`}
              </span>
            ) : null}
          </div>
        </div>
        {campaign.category ? (
          <Badge variant="muted">{campaign.category}</Badge>
        ) : null}
      </div>
    </Card>
  );
}
