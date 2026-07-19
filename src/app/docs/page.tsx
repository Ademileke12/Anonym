import { Metadata } from "next";
import { Container, Section } from "@/components/ui/section";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "API Documentation — Anonym Gateway",
  description:
    "Accept anonymous crypto payments in your app. Integrate Anonym's payment gateway API for privacy-first settlements on Monad.",
};

const BASE = "https://anonympay.vercel.app/api/gateway";

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-subtle">
      {title && (
        <div className="border-b border-line px-4 py-2 text-xs font-medium text-muted">
          {title}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-chip-green-bg text-chip-green-fg",
    POST: "bg-chip-blue-bg text-chip-blue-fg",
    PATCH: "bg-chip-yellow-bg text-chip-yellow-fg",
    DELETE: "bg-chip-red-bg text-chip-red-fg",
  };
  return (
    <span
      className={`inline-block rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-bold ${colors[method] || "bg-chip-gray-bg text-chip-gray-fg"}`}
    >
      {method}
    </span>
  );
}

function EndpointCard({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-line bg-card p-4 shadow-[var(--shadow-xs)]">
      <MethodBadge method={method} />
      <div className="min-w-0 flex-1">
        <code className="text-sm font-medium text-ink">{path}</code>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-base">
      <LandingNavbar />
      <main>
        <Section className="!pt-12 !pb-8 md:!pt-20 md:!pb-12">
          <Container>
            <div className="mx-auto max-w-3xl">
              <span className="mb-4 inline-block rounded-[var(--radius-pill)] bg-inverse px-2.5 py-1 text-xs font-semibold text-on-inverse">
                API Reference
              </span>
              <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
                Anonym Gateway API
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
                Accept anonymous crypto payments in your app. No wallet required
                for your users. Vault-based privacy on Monad.
              </p>
            </div>
          </Container>
        </Section>

        <Section tone="subtle" className="!py-10 md:!py-14">
          <Container>
            <div className="mx-auto max-w-3xl space-y-16">
              {/* Quick Start */}
              <section>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  Quick Start
                </h2>
                <div className="space-y-4">
                  <p className="text-muted leading-relaxed">
                    The Gateway is a plain HTTPS/JSON API — no SDK required. Call
                    it from any language that can make HTTP requests. Every call
                    is authenticated with your secret API key, so it must run on
                    your <span className="font-semibold text-ink">server</span>,
                    never in browser code your users can read.
                  </p>
                  <ol className="ml-5 list-decimal space-y-2 text-muted leading-relaxed">
                    <li>
                      Sign in to the{" "}
                      <a href="/app/merchant" className="font-medium text-ink underline">
                        merchant dashboard
                      </a>{" "}
                      with your wallet and create your merchant account. Your API
                      key (<code>sk_live_…</code>) is shown once — copy it now.
                    </li>
                    <li>Store the key as a server-side environment variable.</li>
                    <li>Create a payment intent from your backend (below).</li>
                    <li>Show your user the amount, collect the on-chain payment, then confirm the intent.</li>
                  </ol>
                  <CodeBlock
                    title="Create a payment intent (curl)"
                    code={`curl -X POST ${BASE}/intents \\
  -H "Authorization: Bearer $ANONYM_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10,
    "token": "MON",
    "description": "Premium subscription",
    "recipient_address": "0xYourReceivingAddress",
    "metadata": { "user_id": "user-123" }
  }'`}
                  />
                  <CodeBlock
                    title="Same request in Node.js (server-side)"
                    code={`const res = await fetch("${BASE}/intents", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.ANONYM_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: 10,
    token: "MON",
    description: "Premium subscription",
    recipient_address: "0xYourReceivingAddress",
    metadata: { user_id: "user-123" },
  }),
});

const { ok, data } = await res.json();
// data.id, data.status ("created"), data.vault_address, data.expires_at`}
                  />
                </div>
              </section>

              {/* Authentication */}
              <section>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  Authentication
                </h2>
                <p className="mb-4 text-muted leading-relaxed">
                  All API requests authenticate via Bearer token in the
                  Authorization header. Your API key is shown once at creation
                  — store it securely.
                </p>
                <CodeBlock
                  title="Request Header"
                  code="Authorization: Bearer sk_live_your_api_key_here"
                />
                <div className="mt-4 rounded-[var(--radius-panel)] border border-line bg-card p-4">
                  <p className="text-sm text-muted">
                    <span className="font-semibold text-ink">Security note:</span>{" "}
                    API keys are stored as SHA-256 hashes. We cannot recover
                    your key if lost. Use the rotation endpoint to generate a
                    new one.
                  </p>
                </div>
              </section>

              {/* Base URL */}
              <section>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  Base URL
                </h2>
                <CodeBlock code={BASE} />
                <p className="mt-3 text-sm text-muted">
                  All endpoints are prefixed with <code>/api/gateway</code>.
                  Rate limit: 100 requests per minute per API key.
                </p>
              </section>

              {/* Payment Flow */}
              <section>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  Payment Flow
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-inverse text-sm font-bold text-on-inverse">
                      1
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">
                        Create Payment Intent
                      </h3>
                      <p className="text-sm text-muted">
                        Call <code>POST /intents</code> with amount and
                        recipient details. Returns deposit instructions.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-inverse text-sm font-bold text-on-inverse">
                      2
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">
                        User Pays
                      </h3>
                      <p className="text-sm text-muted">
                        <strong>Option A (Hosted):</strong> Share the checkout
                        link (<code>/checkout/:id</code>) — the user connects
                        their wallet and pays directly.
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        <strong>Option B (Custom):</strong> User sends MON to
                        the vault address (or their managed wallet). Funds route
                        through Anonym vaults — no direct wallet-to-wallet
                        transfer on-chain.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-inverse text-sm font-bold text-on-inverse">
                      3
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">
                        Confirm Payment
                      </h3>
                      <p className="text-sm text-muted">
                        <strong>Hosted checkout:</strong> Automatic — the page
                        calls <code>POST /checkout/:id/confirm</code> for you.
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        <strong>Custom flow:</strong> Once you observe the
                        on-chain deposit, call{" "}
                        <code>POST /intents/:id/confirm</code> with the{" "}
                        <code>tx_hash</code>. This marks the intent{" "}
                        <code>paid</code>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-inverse text-sm font-bold text-on-inverse">
                      4
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">
                        Webhook Notification
                      </h3>
                      <p className="text-sm text-muted">
                        We POST a <code>payment.paid</code> event to your
                        registered webhook URL. Verify the signature to ensure
                        authenticity.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-inverse text-sm font-bold text-on-inverse">
                      5
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">Settle</h3>
                      <p className="text-sm text-muted">
                        Call <code>POST /settle</code> with the{" "}
                        <code>intent_id</code> to mark a paid intent settled and
                        fire a <code>payment.settled</code> webhook. You can also
                        settle from the merchant dashboard&apos;s{" "}
                        <strong>Payouts</strong> tab.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Endpoints Reference */}
              <section>
                <h2 className="mb-6 text-2xl font-bold tracking-tight">
                  Endpoints
                </h2>

                <div className="space-y-8">
                  {/* Payment Intents */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-ink">
                      Payment Intents
                    </h3>
                    <div className="space-y-2">
                      <EndpointCard
                        method="POST"
                        path="/intents"
                        description="Create a payment intent. Returns the intent with vault_address, commitment_hash, and salt."
                      />
                      <EndpointCard
                        method="GET"
                        path="/intents"
                        description="List payment intents. Filter by status, paginate with limit/offset."
                      />
                      <EndpointCard
                        method="GET"
                        path="/intents/:id"
                        description="Get a single payment intent by ID."
                      />
                      <EndpointCard
                        method="POST"
                        path="/intents/:id/cancel"
                        description="Cancel a pending payment intent. Cannot cancel after payment."
                      />
                      <EndpointCard
                        method="POST"
                        path="/intents/:id/confirm"
                        description="Mark an intent paid. Body: { tx_hash, deposit_id? }. Fires the payment.paid webhook."
                      />
                    </div>
                  </div>

                  {/* Settlement */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-ink">
                      Settlement
                    </h3>
                    <div className="space-y-2">
                      <EndpointCard
                        method="POST"
                        path="/settle"
                        description="Settle a paid intent. Body: { intent_id }. Fires the payment.settled webhook."
                      />
                    </div>
                  </div>

                  {/* Managed Wallets */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-ink">
                      Managed Wallets
                    </h3>
                    <div className="space-y-2">
                      <EndpointCard
                        method="POST"
                        path="/managed-wallets"
                        description="Create a managed wallet for a user. Deterministic address derived from merchant ID + user identifier."
                      />
                      <EndpointCard
                        method="GET"
                        path="/managed-wallets"
                        description="List all managed wallets for your merchant account."
                      />
                      <EndpointCard
                        method="GET"
                        path="/managed-wallets/:address"
                        description="Get details for a specific managed wallet."
                      />
                      <EndpointCard
                        method="DELETE"
                        path="/managed-wallets/:address"
                        description="Freeze a managed wallet. Prevents further deposits."
                      />
                    </div>
                  </div>

                  {/* Webhooks */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-ink">
                      Webhooks
                    </h3>
                    <div className="space-y-2">
                      <EndpointCard
                        method="POST"
                        path="/webhooks"
                        description="Register a webhook endpoint. Specify URL and event types to subscribe to."
                      />
                      <EndpointCard
                        method="GET"
                        path="/webhooks"
                        description="List your webhook endpoints."
                      />
                      <EndpointCard
                        method="DELETE"
                        path="/webhooks/:id"
                        description="Remove a webhook endpoint."
                      />
                    </div>
                  </div>

                  {/* Merchant */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-ink">
                      Merchant
                    </h3>
                    <div className="space-y-2">
                      <EndpointCard
                        method="GET"
                        path="/merchants/me"
                        description="Get your merchant profile and account details."
                      />
                      <EndpointCard
                        method="PATCH"
                        path="/merchants/me"
                        description="Update merchant name and email."
                      />
                    </div>
                  </div>

                  {/* Public Checkout */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-ink">
                      Public Checkout (No Auth)
                    </h3>
                    <div className="space-y-2">
                      <EndpointCard
                        method="GET"
                        path="/checkout/:id"
                        description="Get public intent details for the hosted checkout page. Returns amount, token, status, merchant name, and expires_at. No API key required."
                      />
                      <EndpointCard
                        method="POST"
                        path="/checkout/:id/confirm"
                        description="Confirm a checkout payment. Body: { tx_hash, deposit_id?, salt?, commitment_hash? }. Marks intent as paid and fires payment.paid webhook."
                      />
                      <EndpointCard
                        method="GET"
                        path="/checkout/lookup?wallet=:address"
                        description="Look up an Anonym user profile by wallet address. Returns username, display_name, and avatar_url."
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Create Intent Example */}
              <section>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  Example: Create Intent
                </h2>

                <div className="mb-6 overflow-hidden rounded-[var(--radius-panel)] border border-line">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-line bg-subtle">
                      <tr>
                        <th className="px-4 py-2.5 font-medium text-ink">Field</th>
                        <th className="px-4 py-2.5 font-medium text-ink">Type</th>
                        <th className="px-4 py-2.5 font-medium text-ink">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[
                        ["amount", "number", "Required. Must be positive."],
                        ["token", "string", "Defaults to \"MON\"."],
                        ["currency", "string", "Defaults to \"MON\"."],
                        ["description", "string", "Optional. Shown at checkout."],
                        ["recipient_address", "string", "Optional. 20-byte EVM address that receives the payment."],
                        ["recipient_merchant_id", "string", "Optional. Route to another Anonym merchant instead of an address."],
                        ["use_managed_wallet", "boolean", "Optional. Use the payer's managed wallet as source."],
                        ["payer_label", "string", "Optional. Your identifier for the payer."],
                        ["metadata", "object", "Optional. Arbitrary key/values echoed back to you."],
                        ["idempotency_key", "string", "Optional. Reuse to safely retry without duplicating."],
                        ["expires_in_seconds", "number", "Optional. Defaults to 3600 (1 hour)."],
                      ].map(([field, type, notes]) => (
                        <tr key={field}>
                          <td className="px-4 py-2 font-mono text-xs text-ink">{field}</td>
                          <td className="px-4 py-2 font-mono text-xs text-muted">{type}</td>
                          <td className="px-4 py-2 text-muted">{notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <CodeBlock
                  title="POST /api/gateway/intents"
                  code={`{
  "amount": 25,
  "token": "MON",
  "description": "Annual subscription",
  "recipient_address": "0xYourReceivingAddress",
  "metadata": {
    "order_id": "ord_abc123",
    "plan": "annual"
  },
  "idempotency_key": "order_abc123_1",
  "expires_in_seconds": 1800
}`}
                />
                <div className="mt-3">
                  <CodeBlock
                    title="Response"
                    code={`{
  "ok": true,
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "created",
    "amount": 25,
    "token": "MON",
    "currency": "MON",
    "recipient_address": "0xYourReceivingAddress",
    "commitment_hash": "0x8a3f...",
    "salt": "0xb74e...",
    "vault_address": "0x53A617438fCd546fF7af234e832Ce270b12B3c1C",
    "expires_at": "2026-07-18T15:30:00Z",
    "created_at": "2026-07-18T14:30:00Z"
  }
}`}
                  />
                </div>
                <p className="mt-4 text-sm text-muted">
                  Show your user the <code>amount</code> and{" "}
                  <code>vault_address</code>. After they send MON on Monad and
                  you see the transaction, confirm the intent:
                </p>
                <div className="mt-3">
                  <CodeBlock
                    title="POST /api/gateway/intents/:id/confirm"
                    code={`{
  "tx_hash": "0x9c2f…the on-chain transfer hash",
  "deposit_id": 42
}

// Response: intent with "status": "paid" and "paid_at" set.
// A payment.paid webhook is delivered to your endpoints.`}
                  />
                </div>
              </section>

              {/* Managed Wallet Flow */}
              <section>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  Managed Wallets (No Wallet Required)
                </h2>
                <p className="mb-4 text-muted leading-relaxed">
                  For web2 users who don&apos;t have a crypto wallet, create a
                  managed wallet. Each user gets a deterministic address derived
                  from your merchant ID. Funds deposited here are automatically
                  routed through Anonym vaults.
                </p>
                <CodeBlock
                  title="Create a managed wallet"
                  code={`POST /api/gateway/managed-wallets
{
  "user_identifier": "user-123",
  "label": "Alice's payment wallet"
}

// Response
{
  "ok": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    "derivation_index": 1,
    "status": "active"
  }
}`}
                />
                <p className="mt-4 text-sm text-muted">
                  Your user sends MON to the managed wallet address (from an
                  exchange, fiat on-ramp, or another source). The system
                  detects the deposit and routes it through the vault.
                </p>
              </section>

              {/* Hosted Checkout */}
              <section>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  Hosted Checkout Page
                </h2>
                <p className="mb-4 text-muted leading-relaxed">
                  Use the hosted checkout page to accept payments without
                  building a custom payment UI. Share the checkout link with
                  your user — they connect their wallet, pay, and the intent
                  is automatically confirmed.
                </p>
                <CodeBlock
                  title="Checkout URL"
                  code={`${BASE.replace("/api/gateway", "")}/checkout/{intent_id}`}
                />
                <p className="mt-3 text-sm text-muted">
                  The checkout page handles the full payment flow:
                </p>
                <ol className="ml-5 mt-2 list-decimal space-y-2 text-sm text-muted">
                  <li>Loads intent details from <code>GET /checkout/:id</code></li>
                  <li>User connects their wallet via wagmi</li>
                  <li>Detects if wallet belongs to an Anonym user (for profile display)</li>
                  <li>Checks MON balance and shows insufficient balance state</li>
                  <li>Executes on-chain payment via <code>protocolTransfer</code> (vault deposit)</li>
                  <li>Confirms intent via <code>POST /checkout/:id/confirm</code></li>
                  <li>Shows success state with transaction hash</li>
                </ol>
                <div className="mt-4 rounded-[var(--radius-panel)] border border-line bg-card p-4">
                  <p className="text-sm text-muted">
                    <span className="font-semibold text-ink">Return URL:</span>{" "}
                    Append <code>?return_url=https://your-app.com/success</code> to
                    redirect the user back after successful payment.
                  </p>
                </div>
                <div className="mt-4">
                  <CodeBlock
                    title="Generate a checkout link (Node.js)"
                    code={`// After creating an intent:
const intent = await createIntent({ amount: 10, token: "MON" });

// Build the checkout URL
const checkoutUrl = \`${BASE.replace("/api/gateway", "")}/checkout/\${intent.data.id}?return_url=https://your-app.com/success\`;

// Share this URL with your user
console.log("Pay here:", checkoutUrl);`}
                  />
                </div>
              </section>

              {/* Webhooks */}
              <section>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  Webhooks
                </h2>
                <p className="mb-4 text-muted leading-relaxed">
                  Register a webhook endpoint to receive payment notifications.
                  Each request carries a SHA-256 signature so you can verify it
                  came from Anonym. Your signing secret (<code>whsec_…</code>) is
                  returned when you create the endpoint.
                </p>

                <h3 className="mb-2 text-lg font-semibold text-ink">
                  Event Types
                </h3>
                <p className="mb-3 text-sm text-muted">
                  Two events are delivered today. New endpoints subscribe to
                  these by default; pass an <code>events</code> array when
                  registering to narrow the set.
                </p>
                <div className="mb-4 space-y-1">
                  {[
                    ["payment.paid", "Sent after you confirm an intent."],
                    ["payment.settled", "Sent after you settle a paid intent."],
                  ].map(([event, note]) => (
                    <div
                      key={event}
                      className="flex items-center gap-3 rounded-[var(--radius-input)] bg-card px-3 py-2 text-sm"
                    >
                      <span className="rounded-[var(--radius-pill)] bg-chip-purple-bg px-2 py-0.5 text-[11px] font-medium text-chip-purple-fg">
                        {event}
                      </span>
                      <span className="text-muted">{note}</span>
                    </div>
                  ))}
                </div>

                <h3 className="mb-2 text-lg font-semibold text-ink">
                  Register an endpoint
                </h3>
                <CodeBlock
                  title="POST /api/gateway/webhooks"
                  code={`{
  "url": "https://your-app.com/webhooks/anonym",
  "events": ["payment.paid", "payment.settled"]
}

// Response includes the signing secret — store it, shown once:
// { "ok": true, "data": { "id": "...", "url": "...", "secret": "whsec_..." } }`}
                />

                <h3 className="mb-2 mt-4 text-lg font-semibold text-ink">
                  Verifying Signatures
                </h3>
                <p className="mb-3 text-sm text-muted">
                  The signature is{" "}
                  <code>sha256(&quot;{"{timestamp}.{raw_body}.{secret}"}&quot;)</code>.
                  Compute it over the exact raw request body bytes — do not
                  re-serialize the parsed JSON, or key ordering will change the
                  hash.
                </p>
                <CodeBlock
                  title="Webhook Headers"
                  code={`X-Anonym-Signature: sha256=<hex_signature>
X-Anonym-Timestamp: <unix_timestamp>
X-Anonym-Event: payment.paid`}
                />
                <CodeBlock
                  title="Verify in Node.js"
                  code={`import crypto from "crypto";

// rawBody: the exact string received, before JSON.parse
function verifyWebhook(rawBody, headers, secret) {
  const timestamp = headers["x-anonym-timestamp"];
  const signature = headers["x-anonym-signature"]; // "sha256=<hex>"

  const expected =
    "sha256=" +
    crypto
      .createHash("sha256")
      .update(\`\${timestamp}.\${rawBody}.\${secret}\`)
      .digest("hex");

  // constant-time compare to avoid timing leaks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}`}
                />
              </section>

              {/* Error Handling */}
              <section>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  Error Handling
                </h2>
                <p className="mb-4 text-muted leading-relaxed">
                  All errors return a consistent JSON structure with an{" "}
                  <code>error</code> message and optional <code>code</code>.
                </p>
                <CodeBlock
                  title="Error Response"
                  code={`{
  "ok": false,
  "error": "Amount must be positive",
  "code": "INVALID_AMOUNT"
}`}
                />
                <div className="mt-4 overflow-hidden rounded-[var(--radius-panel)] border border-line">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-line bg-subtle">
                      <tr>
                        <th className="px-4 py-2.5 font-medium text-ink">
                          Code
                        </th>
                        <th className="px-4 py-2.5 font-medium text-ink">
                          HTTP Status
                        </th>
                        <th className="px-4 py-2.5 font-medium text-ink">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs text-muted">
                          UNAUTHORIZED
                        </td>
                        <td className="px-4 py-2 text-muted">401</td>
                        <td className="px-4 py-2 text-muted">
                          Invalid or missing API key
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs text-muted">
                          RATE_LIMITED
                        </td>
                        <td className="px-4 py-2 text-muted">429</td>
                        <td className="px-4 py-2 text-muted">
                          Too many requests. Retry after cooldown.
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs text-muted">
                          INVALID_AMOUNT
                        </td>
                        <td className="px-4 py-2 text-muted">400</td>
                        <td className="px-4 py-2 text-muted">
                          Payment amount must be positive
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs text-muted">
                          INVALID_STATUS
                        </td>
                        <td className="px-4 py-2 text-muted">400</td>
                        <td className="px-4 py-2 text-muted">
                          Operation not allowed in current intent status
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs text-muted">
                          NOT_FOUND
                        </td>
                        <td className="px-4 py-2 text-muted">404</td>
                        <td className="px-4 py-2 text-muted">
                          Resource does not exist
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Privacy */}
              <section>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  Privacy Architecture
                </h2>
                <p className="mb-4 text-muted leading-relaxed">
                  Every payment through the Gateway API is routed through
                  Anonym vaults. The blockchain shows only vault interactions —
                  never direct wallet-to-wallet transfers. Your users&apos;
                  financial relationships stay private.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[var(--radius-panel)] border border-line bg-card p-4 shadow-[var(--shadow-xs)]">
                    <h4 className="font-semibold text-ink">
                      Vault Settlement
                    </h4>
                    <p className="mt-1 text-sm text-muted">
                      All funds route through TransferVault smart contracts.
                      No direct P2P hops on-chain.
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-panel)] border border-line bg-card p-4 shadow-[var(--shadow-xs)]">
                    <h4 className="font-semibold text-ink">
                      Commitment Hashes
                    </h4>
                    <p className="mt-1 text-sm text-muted">
                      Cryptographic commitments link deposits to recipients
                      without revealing addresses on-chain.
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-panel)] border border-line bg-card p-4 shadow-[var(--shadow-xs)]">
                    <h4 className="font-semibold text-ink">Nullifiers</h4>
                    <p className="mt-1 text-sm text-muted">
                      Prevent double-spending without a public ledger of
                      recipient addresses.
                    </p>
                  </div>
                </div>
              </section>

              {/* Support */}
              <section className="!mb-0">
                <div className="rounded-[var(--radius-card)] border border-line bg-inverse px-8 py-10 text-center text-on-inverse shadow-[var(--shadow-elevated)]">
                  <h2 className="text-2xl font-bold tracking-tight">
                    Need help?
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-on-inverse/70">
                    Reach out to the Anonym team for API access, enterprise
                    pricing, or integration support.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <a
                      href="https://twitter.com/anaboron"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center rounded-[var(--radius-pill)] bg-base px-5 text-sm font-medium text-ink transition hover:bg-base/90"
                    >
                      Contact on X
                    </a>
                    <a
                      href="https://discord.gg/anonym"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center rounded-[var(--radius-pill)] border border-white/20 bg-transparent px-5 text-sm font-medium text-on-inverse transition hover:bg-white/10"
                    >
                      Join Discord
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </Container>
        </Section>
      </main>
      <LandingFooter />
    </div>
  );
}
