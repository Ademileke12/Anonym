"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import {
  updateUserProfile,
  upsertStartup,
  getStartupByUserId,
  type TeamMember,
} from "@/services/data/users";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Plus, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { user, setUser, signOut } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [website, setWebsite] = useState(user?.website ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [monad, setMonad] = useState(user?.monad_receiving_address ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null);
  const [coverUrl, setCoverUrl] = useState<string | null>(user?.cover_image ?? null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [startupName, setStartupName] = useState("");
  const [whitepaper, setWhitepaper] = useState("");
  const [pitchDeck, setPitchDeck] = useState("");
  const [team, setTeam] = useState<TeamMember[]>([{ name: "", role: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.account_type !== "startup") return;
    void getStartupByUserId(user.id).then((s) => {
      if (s) {
        setLogoUrl(s.logo);
        setStartupName(s.startup_name);
        setWhitepaper(s.whitepaper_url ?? "");
        setPitchDeck(s.pitch_deck_url ?? "");
        const members = (s.team_members as TeamMember[] | null) ?? [];
        setTeam(members.length ? members : [{ name: "", role: "" }]);
      }
    });
  }, [user]);

  if (!user) {
    return <div className="p-8 text-muted">No profile loaded.</div>;
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await updateUserProfile(user!.wallet_address, {
        display_name: displayName || null,
        bio: bio || null,
        website: website || null,
        country: country || null,
        monad_receiving_address: monad || user!.wallet_address,
        avatar_url: avatarUrl,
        cover_image: coverUrl,
      });
      if (user!.account_type === "startup" && startupName) {
        await upsertStartup({
          user_id: user!.id,
          startup_name: startupName,
          logo: logoUrl,
          website: website || null,
          whitepaper_url: whitepaper.trim() || null,
          pitch_deck_url: pitchDeck.trim() || null,
          team_members: team.filter((t) => t.name.trim() && t.role.trim()),
        });
      }
      setUser(updated);
      toast({ title: "Settings saved", tone: "success" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-5 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted">
          @{user.username} · {user.account_type}
        </p>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload
            bucket="avatars"
            wallet={user.wallet_address}
            value={avatarUrl}
            onChange={setAvatarUrl}
            label="Avatar"
            aspect="square"
          />
          {user.account_type === "startup" ? (
            <ImageUpload
              bucket="logos"
              wallet={user.wallet_address}
              value={logoUrl}
              onChange={setLogoUrl}
              label="Startup logo"
              aspect="square"
            />
          ) : null}
        </div>
        <ImageUpload
          bucket="covers"
          wallet={user.wallet_address}
          value={coverUrl}
          onChange={setCoverUrl}
          label="Cover image"
          aspect="cover"
        />
        {user.account_type === "startup" ? (
          <>
            <div>
              <Label htmlFor="startup">Startup name</Label>
              <Input
                id="startup"
                value={startupName}
                onChange={(e) => setStartupName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="wp">Whitepaper URL</Label>
              <Input
                id="wp"
                value={whitepaper}
                onChange={(e) => setWhitepaper(e.target.value)}
                placeholder="https://"
              />
            </div>
            <div>
              <Label htmlFor="deck">Pitch deck URL</Label>
              <Input
                id="deck"
                value={pitchDeck}
                onChange={(e) => setPitchDeck(e.target.value)}
                placeholder="https://"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="mb-0">Team members</Label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
                  onClick={() => setTeam((t) => [...t, { name: "", role: "" }])}
                >
                  <Plus className="size-3.5" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {team.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="Name"
                      value={m.name}
                      onChange={(e) => {
                        const next = [...team];
                        next[i] = { ...next[i], name: e.target.value };
                        setTeam(next);
                      }}
                    />
                    <Input
                      placeholder="Role"
                      value={m.role}
                      onChange={(e) => {
                        const next = [...team];
                        next[i] = { ...next[i], role: e.target.value };
                        setTeam(next);
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-lg border border-line p-2 text-muted hover:text-ink"
                      onClick={() =>
                        setTeam((t) => t.filter((_, j) => j !== i))
                      }
                      aria-label="Remove member"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
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
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
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
        <div>
          <Label htmlFor="monad">Monad receiving address</Label>
          <Input
            id="monad"
            value={monad}
            onChange={(e) => setMonad(e.target.value)}
          />
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Appearance</h2>
        <p className="text-sm text-muted">
          Light, dark, or match your system preference.
        </p>
        <ThemeToggle />
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Session</h2>
        <p className="break-all text-sm text-muted">{user.wallet_address}</p>
        <Button variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </Card>
    </div>
  );
}
