"use client";

import { useState } from "react";
import { Container, Section } from "@/components/ui/section";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Which wallets are supported?",
    a: "MetaMask, Rabby, WalletConnect, OKX Wallet, and other EIP-1193 injected wallets. Authentication is wallet-only, no email or password. Anonym never asks for private keys.",
  },
  {
    q: "Do I put a private key anywhere?",
    a: "No. Never. You only connect a wallet and sign transactions. Protocol vaults are smart contracts (public addresses in env). Optional treasury/hold addresses are public 0x addresses only, never private keys.",
  },
  {
    q: "How does the privacy protocol work?",
    a: "Transfers deposit into a TransferVault with a cryptographic commitment; recipients claim later. Campaign donations go to a CampaignVault; owners withdraw. There is no product path that sends MON straight wallet→wallet.",
  },
  {
    q: "Why Monad?",
    a: "Anonym is built natively for Monad Testnet for high throughput and low fees, with a clear path to Monad mainnet.",
  },
  {
    q: "What can I do with campaigns?",
    a: "Create public or private-link campaigns. Supporters Donate Securely into the campaign vault (anonymous or revealed). Owners withdraw vault balance when ready, not one-by-one to a public wallet on donate.",
  },
  {
    q: "What are protected transfers?",
    a: "Send to an @username. Funds lock in the protocol vault; the recipient claims from their dashboard. Profiles never publish a receiving address.",
  },
  {
    q: "What is Backdoor?",
    a: "Backdoor is Anonym's optional, authenticated reveal of your own private payment details (counterparties, notes, vault deposits). It is closed by default so the public graph stays incomplete. On testnet you can open it free to try; production can require a paid unlock.",
  },
  {
    q: "What's on the roadmap?",
    a: "Zero-knowledge proofs, shielded payments, private balances, payroll, grants, encrypted messaging, and mobile apps.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section id="faq" tone="subtle">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Answers before you connect.
          </h2>
        </div>
        <div className="mx-auto mt-12 max-w-2xl divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-ink">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen ? (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted">
                    {item.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
