/** Shorten a wallet address for UI. */
export function shortAddress(address?: string | null, chars = 4) {
  if (!address) return "";
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Format MON amounts with sensible decimals. */
export function formatMon(amount: number | string, digits = 2) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

/** Relative time string. */
export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function countdownParts(deadline: string | null) {
  if (!deadline) return null;
  const end = new Date(deadline).getTime();
  const now = Date.now();
  const ms = Math.max(0, end - now);
  const totalSec = Math.floor(ms / 1000);
  return {
    expired: ms <= 0,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

export const CAMPAIGN_CATEGORIES = [
  "Medical",
  "Education",
  "Startup",
  "Creator",
  "Business",
  "Emergency",
  "Investment",
  "Charity",
  "Community",
  "Other",
] as const;

export const SOCIAL_PLATFORMS = [
  "x",
  "instagram",
  "linkedin",
  "discord",
  "telegram",
  "github",
  "tiktok",
  "facebook",
  "youtube",
  "onlyfans",
  "custom",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
