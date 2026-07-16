"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getSocials,
  getStartupByUserId,
  getUserByUsername,
} from "@/services/data/users";
import { listCampaignsByOwner } from "@/services/data/campaigns";
import { isSupabaseConfigured } from "@/lib/env";
import { Container } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Globe, HeartHandshake, Shield } from "lucide-react";
import type {
  Campaign,
  Social,
  Startup,
  User,
} from "@/services/data/types";

function SocialIcon({ platform }: { platform: string }) {
  if (platform === "website") return <Globe className="size-4" />;
  return <ExternalLink className="size-4" />;
}

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const raw = decodeURIComponent(params.username).replace(/^@/, "");
  const [user, setUser] = useState<User | null>(null);
  const [startup, setStartup] = useState<Startup | null>(null);
  const [socials, setSocials] = useState<Social[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const u = await getUserByUsername(raw);
        if (cancelled) return;
        setUser(u);
        if (u) {
          const [st, soc, camps] = await Promise.all([
            getStartupByUserId(u.id),
            getSocials(u.id),
            listCampaignsByOwner(u.id),
          ]);
          if (cancelled) return;
          setStartup(st);
          setSocials(soc);
          setCampaigns(camps.filter((c) => c.visibility === "public"));
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [raw]);

  return (
    <div className="min-h-0 flex-1">
      {loading ? (
        <Container className="py-16">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="mt-8 h-48 w-full" />
        </Container>
      ) : error || !user ? (
        <Container className="py-20">
          <EmptyState
            title={error || "Profile not found"}
            description={
              error ? error : `No user @${raw} on Anonym.`
            }
            action={
              <Button asChild variant="secondary">
                <Link href="/app">Back to app</Link>
              </Button>
            }
          />
        </Container>
      ) : (
        <>
          {/* Banner */}
          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-subtle via-muted-bg to-chip-blue-bg/40 sm:h-48 md:h-52">
            {user.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.cover_image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
          </div>

          {/* Avatar + profile info */}
          <Container className="relative px-4 sm:px-6">
            {/* Avatar overlapping banner */}
            <div className="-mt-16 sm:-mt-20">
              {user.avatar_url || startup?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={startup?.logo || user.avatar_url || ""}
                  alt=""
                  className="size-24 rounded-full border-4 border-base object-cover shadow-[var(--shadow-card)] sm:size-32"
                />
              ) : (
                <div className="flex size-24 items-center justify-center rounded-full border-4 border-base bg-inverse text-3xl font-bold text-on-inverse shadow-[var(--shadow-card)] sm:size-32 sm:text-4xl">
                  {(user.display_name ?? user.username)
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              )}
            </div>

            {/* Name + actions row */}
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {startup?.startup_name ??
                    user.display_name ??
                    user.username}
                </h1>
                <p className="text-sm text-muted">@{user.username}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Shield className="size-3" />
                    Protected by Anonym
                  </Badge>
                  {user.account_type === "startup" ? (
                    <Badge variant="purple">Startup</Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {user.website ? (
                  <Button asChild variant="secondary" size="sm">
                    <a href={user.website} target="_blank" rel="noreferrer">
                      <Globe className="size-4" /> Website
                    </a>
                  </Button>
                ) : null}
                <Button asChild size="sm">
                  <Link href={`/app/transfer?to=${user.username}`}>
                    Send privately
                  </Link>
                </Button>
              </div>
            </div>

            <p className="mt-4 flex items-center gap-2 text-xs text-muted">
              <Shield className="size-3.5 shrink-0 text-chip-green-fg" />
              Payments go through Anonym vaults. This profile never exposes a
              receiving wallet.
            </p>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-1">
                <Card>
                  <h2 className="font-semibold">About</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {user.bio ?? startup?.description ?? "No bio yet."}
                  </p>
                  {startup?.mission ? (
                    <div className="mt-4 border-t border-line pt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-faint">
                        Mission
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {startup.mission}
                      </p>
                    </div>
                  ) : null}
                  {startup?.category ? (
                    <Badge variant="muted" className="mt-4">
                      {startup.category}
                    </Badge>
                  ) : null}
                  {(startup?.whitepaper_url || startup?.pitch_deck_url) ? (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                      {startup.whitepaper_url ? (
                        <a
                          href={startup.whitepaper_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:text-ink"
                        >
                          Whitepaper
                        </a>
                      ) : null}
                      {startup.pitch_deck_url ? (
                        <a
                          href={startup.pitch_deck_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:text-ink"
                        >
                          Pitch deck
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </Card>

                {startup?.team_members &&
                Array.isArray(startup.team_members) &&
                (startup.team_members as { name?: string }[]).length > 0 ? (
                  <Card>
                    <h2 className="mb-3 font-semibold">Team</h2>
                    <ul className="space-y-2">
                      {(
                        startup.team_members as {
                          name: string;
                          role: string;
                          social_url?: string | null;
                        }[]
                      )
                        .filter((m) => m.name)
                        .map((m, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <div>
                              <p className="font-medium">{m.name}</p>
                              <p className="text-xs text-muted">{m.role}</p>
                            </div>
                            {m.social_url ? (
                              <a
                                href={m.social_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-muted hover:text-ink"
                              >
                                Link
                              </a>
                            ) : null}
                          </li>
                        ))}
                    </ul>
                  </Card>
                ) : null}

                {socials.length > 0 ? (
                  <Card>
                    <h2 className="mb-3 font-semibold">Socials</h2>
                    <ul className="space-y-2">
                      {socials.map((s) => (
                        <li key={s.id}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink"
                          >
                            <SocialIcon platform={s.platform} />
                            <span className="capitalize">{s.platform}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : null}
              </div>

              <div className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Campaigns</h2>
                  <span className="text-sm text-muted">
                    {campaigns.length} public
                  </span>
                </div>
                {campaigns.length === 0 ? (
                  <EmptyState
                    icon={HeartHandshake}
                    title="No public campaigns"
                    description="This profile has not published a raise yet."
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {campaigns.map((c) => (
                      <CampaignCard key={c.id} campaign={c} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Container>
        </>
      )}
    </div>
  );
}
