// ⚠️ THROWAWAY TEST FILE — delete after trying the gateway.
// Models a merchant's backend: holds the secret API key server-side and calls
// the Anonym gateway over HTTP with `Authorization: Bearer <key>`.
// The browser never sees the key.
import { NextResponse } from "next/server";
import { getUserByWallet } from "@/services/data/users";

export const runtime = "nodejs";

function apiKey(): string | null {
  return process.env.GATEWAY_TEST_API_KEY?.trim() || null;
}

/** Call our own gateway the way an external platform would. */
async function gateway(
  origin: string,
  path: string,
  init: { method: string; body?: unknown },
) {
  const key = apiKey();
  if (!key) {
    return {
      ok: false,
      status: 500,
      json: { ok: false, error: "GATEWAY_TEST_API_KEY is not set on the server" },
    };
  }

  const res = await fetch(`${origin}/api/gateway${path}`, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({ ok: false, error: "Bad gateway response" }));
  return { ok: res.ok, status: res.status, json };
}

export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const body = await request.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "create") {
      // Fetch the merchant's payout wallet from the gateway so the vault
      // commitment is bound to the merchant, not the treasury or the payer.
      let recipient_address: string | undefined;
      const me = await gateway(origin, "/merchants/me", { method: "GET" });
      if (me.json?.ok && me.json?.data?.payout_address) {
        recipient_address = me.json.data.payout_address;
      }

      const r = await gateway(origin, "/intents", {
        method: "POST",
        body: {
          amount: Number(body.amount) || 1,
          token: "MON",
          currency: "MON",
          description: body.description || "Playground test payment",
          payer_label: body.payer_label || "test-user",
          ...(recipient_address ? { recipient_address } : {}),
          metadata: body.metadata || {},
          expires_in_seconds: 3600,
        },
      });
      return NextResponse.json(r.json, { status: r.status });
    }

    if (action === "get") {
      const r = await gateway(origin, `/intents/${body.id}`, { method: "GET" });
      return NextResponse.json(r.json, { status: r.status });
    }

    if (action === "confirm") {
      // The checkout page already moved real MON on-chain. Confirm the intent
      // with the REAL tx hash + vault deposit id so it flips to `paid` and the
      // payment.paid webhook fires. No fake hashes here.
      const txHash = typeof body.tx_hash === "string" ? body.tx_hash : null;
      if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return NextResponse.json(
          { ok: false, error: "A real on-chain tx_hash is required to confirm" },
          { status: 400 },
        );
      }
      const depositId =
        body.deposit_id != null && Number.isFinite(Number(body.deposit_id))
          ? Number(body.deposit_id)
          : undefined;

      const r = await gateway(origin, `/intents/${body.id}/confirm`, {
        method: "POST",
        body: { tx_hash: txHash, deposit_id: depositId },
      });
      return NextResponse.json(r.json, { status: r.status });
    }

    if (action === "lookup") {
      // "Is this payer on the Anonym platform?" — powers the personalized
      // checkout. Only returns public profile bits, never anything sensitive.
      const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return NextResponse.json({ ok: true, data: null });
      }
      const user = await getUserByWallet(wallet).catch(() => null);
      return NextResponse.json({
        ok: true,
        data: user
          ? {
              username: user.username,
              display_name: user.display_name,
              avatar_url: user.avatar_url,
            }
          : null,
      });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
