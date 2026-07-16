"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useAuth } from "@/providers/auth-provider";
import {
  createUserProfile,
  isUsernameAvailable,
  replaceSocials,
  upsertStartup,
} from "@/services/data/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/components/ui/toast";
import { SOCIAL_PLATFORMS } from "@/lib/format";
import { Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/services/supabase/types";

type SocialRow = { platform: string; url: string };

export default function OnboardingPage() {
  const { wallet, setUser, isAuthenticated, refreshUser } = useAuth();
  const { address } = useAccount();
  const sessionWallet = (wallet ?? address ?? "").toLowerCase();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState<AccountType>("regular");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [monadAddress, setMonadAddress] = useState(sessionWallet);
  const [startupName, setStartupName] = useState("");
  const [mission, setMission] = useState("");
  const [category, setCategory] = useState("Startup");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [whitepaper, setWhitepaper] = useState("");
  const [pitchDeck, setPitchDeck] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamRole, setTeamRole] = useState("");
  const [socials, setSocials] = useState<SocialRow[]>([
    { platform: "x", url: "" },
    { platform: "github", url: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [usernameOk, setUsernameOk] = useState(false);
  const [checking, setChecking] = useState(false);

  const usernameClean = username.toLowerCase().replace(/[^a-z0-9_]/g, "");

  useEffect(() => {
    if (sessionWallet && !monadAddress) setMonadAddress(sessionWallet);
  }, [sessionWallet, monadAddress]);

  useEffect(() => {
    if (usernameClean.length < 3) {
      setUsernameOk(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const t = window.setTimeout(() => {
      void isUsernameAvailable(usernameClean, sessionWallet)
        .then((ok) => {
          if (!cancelled) setUsernameOk(ok);
        })
        .catch(() => {
          if (!cancelled) setUsernameOk(false);
        })
        .finally(() => {
          if (!cancelled) setChecking(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [usernameClean, sessionWallet]);

  function addSocial() {
    setSocials((s) => [...s, { platform: "custom", url: "" }]);
  }

  async function finish() {
    if (!sessionWallet) {
      toast({ title: "Connect a wallet first", tone: "error" });
      return;
    }
    if (!usernameOk) {
      toast({ title: "Pick an available username", tone: "error" });
      return;
    }
    if (accountType === "startup") {
      const filled = socials.filter((s) => s.url.trim());
      if (filled.length < 2) {
        toast({
          title: "Startups need at least 2 social links",
          tone: "error",
        });
        return;
      }
      if (!startupName.trim()) {
        toast({ title: "Startup name is required", tone: "error" });
        return;
      }
    }

    setSaving(true);
    try {
      const user = await createUserProfile({
        wallet_address: sessionWallet,
        username: usernameClean,
        display_name: displayName || startupName || usernameClean,
        bio: bio || description || null,
        avatar_url: avatarUrl,
        cover_image: coverUrl,
        account_type: accountType,
        monad_receiving_address: monadAddress || sessionWallet,
        country: country || null,
        website: website || null,
      });

      await replaceSocials(
        user.id,
        socials.filter((s) => s.url.trim()),
      );

      if (accountType === "startup") {
        await upsertStartup({
          user_id: user.id,
          startup_name: startupName,
          description,
          mission,
          category,
          website: website || null,
          logo: logoUrl,
          whitepaper_url: whitepaper.trim() || null,
          pitch_deck_url: pitchDeck.trim() || null,
          team_members:
            teamName.trim() && teamRole.trim()
              ? [{ name: teamName.trim(), role: teamRole.trim() }]
              : [],
        });
      }

      setUser(user);
      await refreshUser();
      toast({ title: "Profile created", tone: "success" });
      router.replace("/app");
    } catch (e) {
      toast({
        title: "Could not create profile",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated && !address) {
    return (
      <div className="p-8 text-center text-muted">
        Connect your wallet to continue onboarding.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-5 md:p-10">
      <p className="text-sm font-medium text-muted">
        Onboarding · Step {step + 1} of 3
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        {step === 0 && "Choose account type"}
        {step === 1 && "Claim your username"}
        {step === 2 && "Finish your profile"}
      </h1>

      {step === 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                type: "regular" as const,
                title: "Regular user",
                body: "Send and receive private payments, support campaigns.",
                icon: User,
              },
              {
                type: "startup" as const,
                title: "Startup",
                body: "Public company profile, mission, and fundraising.",
                icon: Building2,
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => setAccountType(opt.type)}
              className={cn(
                "rounded-[var(--radius-card)] border p-5 text-left transition-all",
                accountType === opt.type
                  ? "border-ink bg-card shadow-[var(--shadow-card)]"
                  : "border-line bg-subtle hover:bg-card",
              )}
            >
              <opt.icon className="mb-3 size-5 text-muted" />
              <p className="font-semibold">{opt.title}</p>
              <p className="mt-1 text-sm text-muted">{opt.body}</p>
            </button>
          ))}
          <div className="sm:col-span-2 mt-4">
            <Button className="w-full" onClick={() => setStep(1)}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <Card className="mt-8">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
              @
            </span>
            <Input
              id="username"
              className="pl-8"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alex"
              autoComplete="off"
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            3–30 characters · checked live against Supabase
          </p>
          {usernameClean.length >= 3 ? (
            <p
              className={cn(
                "mt-2 text-sm",
                checking
                  ? "text-muted"
                  : usernameOk
                    ? "text-chip-green-fg"
                    : "text-chip-red-fg",
              )}
            >
              {checking
                ? "Checking…"
                : usernameOk
                  ? `@${usernameClean} is available`
                  : `@${usernameClean} is taken or invalid`}
            </p>
          ) : null}
          <div className="mt-6 flex gap-2">
            <Button variant="secondary" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={!usernameOk}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="mt-8 space-y-4">
          {accountType === "startup" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageUpload
                  bucket="logos"
                  wallet={sessionWallet}
                  value={logoUrl}
                  onChange={setLogoUrl}
                  label="Startup logo"
                  aspect="square"
                />
                <ImageUpload
                  bucket="covers"
                  wallet={sessionWallet}
                  value={coverUrl}
                  onChange={setCoverUrl}
                  label="Cover image"
                  aspect="cover"
                  className="sm:col-span-1"
                />
              </div>
              <div>
                <Label htmlFor="startup">Startup name</Label>
                <Input
                  id="startup"
                  value={startupName}
                  onChange={(e) => setStartupName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mission">Mission</Label>
                <Textarea
                  id="mission"
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
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
                <Label htmlFor="cat">Category</Label>
                <Input
                  id="cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="wp">Whitepaper URL (optional)</Label>
                <Input
                  id="wp"
                  value={whitepaper}
                  onChange={(e) => setWhitepaper(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div>
                <Label htmlFor="deck">Pitch deck URL (optional)</Label>
                <Input
                  id="deck"
                  value={pitchDeck}
                  onChange={(e) => setPitchDeck(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="tm">Team member (optional)</Label>
                  <Input
                    id="tm"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <Label htmlFor="tr">Role</Label>
                  <Input
                    id="tr"
                    value={teamRole}
                    onChange={(e) => setTeamRole(e.target.value)}
                    placeholder="CEO"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <ImageUpload
                bucket="avatars"
                wallet={sessionWallet}
                value={avatarUrl}
                onChange={setAvatarUrl}
                label="Avatar"
                aspect="square"
              />
              <ImageUpload
                bucket="covers"
                wallet={sessionWallet}
                value={coverUrl}
                onChange={setCoverUrl}
                label="Cover image"
                aspect="cover"
              />
              <div>
                <Label htmlFor="display">Display name</Label>
                <Input
                  id="display"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
            />
          </div>
          <div>
            <Label htmlFor="monad">Monad receiving address</Label>
            <Input
              id="monad"
              value={monadAddress}
              onChange={(e) => setMonadAddress(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Social links</Label>
              <button
                type="button"
                className="text-xs font-medium text-muted hover:text-ink"
                onClick={addSocial}
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {socials.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    className="h-11 rounded-[var(--radius-input)] border border-line-strong bg-card px-2 text-sm"
                    value={row.platform}
                    onChange={(e) => {
                      const next = [...socials];
                      next[i] = { ...next[i], platform: e.target.value };
                      setSocials(next);
                    }}
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="https://"
                    value={row.url}
                    onChange={(e) => {
                      const next = [...socials];
                      next[i] = { ...next[i], url: e.target.value };
                      setSocials(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => void finish()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Enter Anonym"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
