// ⚠️ THROWAWAY DEMO STOREFRONT — delete after trying the gateway.
// This models an external merchant's product page (think: an NFT drop site).
// It never touches the secret key. Clicking "Pay with Anonym" creates a payment
// intent via the merchant backend (/api/playground) and hands the shopper off to
// the hosted Anonym checkout, exactly like a "Pay with Stripe" redirect.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnonymLogo } from "@/components/brand/logo";

const PRICE_MON = 2;
const PRODUCT = {
  name: "Monad Genesis Pass #0427",
  collection: "Anonym Demo Collection",
  price: PRICE_MON,
};

export default function StorefrontPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payWithAnonym() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          amount: PRODUCT.price,
          description: `${PRODUCT.name} — ${PRODUCT.collection}`,
          payer_label: "storefront-guest",
          metadata: { product: PRODUCT.name, kind: "nft" },
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Could not start checkout");
        return;
      }
      // Hand off to the hosted Anonym checkout, Stripe-style.
      router.push(`/checkout/${json.data.id}?return_url=${encodeURIComponent(`${window.location.origin}/playground`)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-tight">
            ◆ Genesis Market
          </span>
          <span className="text-xs text-muted">Demo storefront</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-2 md:py-16">
        {/* Product art */}
        <div>
          <div
            className="aspect-square w-full rounded-2xl border border-line shadow-sm"
            style={{
              background:
                "radial-gradient(120% 120% at 20% 10%, #6d5efc 0%, #3b2ea8 40%, #120b2e 100%)",
            }}
          >
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="text-6xl">🪪</span>
              <span className="text-sm font-medium text-white/80">
                {PRODUCT.collection}
              </span>
            </div>
          </div>
        </div>

        {/* Buy box */}
        <div className="flex flex-col justify-center">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            {PRODUCT.collection}
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {PRODUCT.name}
          </h1>
          <p className="mt-3 leading-relaxed text-muted">
            A one-of-a-kind demo NFT. Checkout is powered by Anonym — your
            payment is settled privately through an on-chain vault, so the
            collection never sees your wallet.
          </p>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-bold">{PRODUCT.price}</span>
            <span className="text-lg font-medium text-muted">MON</span>
          </div>

          {/* Stripe-style branded pay button */}
          <button
            onClick={() => void payWithAnonym()}
            disabled={busy}
            className="mt-6 inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-inverse px-6 text-on-inverse shadow-[var(--shadow-elevated)] transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? (
              <span className="text-sm font-medium">Starting checkout…</span>
            ) : (
              <>
                <span className="text-[15px] font-medium opacity-80">
                  Pay with
                </span>
                <AnonymLogo size={22} inverse />
              </>
            )}
          </button>

          {error ? (
            <p className="mt-3 text-sm text-chip-red-fg">{error}</p>
          ) : (
            <p className="mt-3 text-xs text-muted">
              You&apos;ll be redirected to Anonym&apos;s secure checkout. Real
              testnet MON, settled anonymously.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
