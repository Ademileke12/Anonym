/**
 * Claim-link helpers for vault deposits (registered users + raw wallets).
 */

export function buildClaimPath(depositId: string, salt: string): string {
  const params = new URLSearchParams({
    id: depositId,
    salt: salt.startsWith("0x") ? salt : `0x${salt}`,
  });
  return `/claim?${params.toString()}`;
}

export function buildClaimUrl(
  depositId: string,
  salt: string,
  origin?: string,
): string {
  const path = buildClaimPath(depositId, salt);
  if (origin) return `${origin.replace(/\/$/, "")}${path}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return app ? `${app}${path}` : path;
}

export function buildPayDeepLink(opts: {
  to?: string;
  amount?: string;
  campaign?: string;
  request?: string;
  origin?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.to) params.set("to", opts.to.replace(/^@/, ""));
  if (opts.amount) params.set("amount", opts.amount);
  if (opts.campaign) params.set("campaign", opts.campaign);
  if (opts.request) params.set("request", opts.request);
  const q = params.toString();
  const path = q ? `/app/transfer?${q}` : "/app/transfer";
  const origin =
    opts.origin ??
    (typeof window !== "undefined" ? window.location.origin : "") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "";
  return origin ? `${origin.replace(/\/$/, "")}${path}` : path;
}

export function buildRequestPayPath(requestId: string): string {
  return `/app/transfer?request=${requestId}`;
}
