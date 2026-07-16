"use client";

import { motion } from "framer-motion";
import { Container, Section } from "@/components/ui/section";
import {
  Send,
  HeartHandshake,
  Building2,
  Activity,
  Shield,
  KeyRound,
} from "lucide-react";

const features = [
  {
    icon: Send,
    title: "Protected transfers",
    body: "Send to @username via TransferVault. Recipient claims from the dashboard, never a direct send.",
  },
  {
    icon: HeartHandshake,
    title: "Vault-backed fundraising",
    body: "Donate Securely into a campaign vault. Owners withdraw when ready, not per-donation P2P.",
  },
  {
    icon: KeyRound,
    title: "Backdoor",
    body: "Optional reveal of your private payment details. Closed by default, open only for your session.",
  },
  {
    icon: Building2,
    title: "Startup profiles",
    body: "Public pages at /anonym/@username, mission, socials, campaigns. No receiving wallet shown.",
  },
  {
    icon: Activity,
    title: "Protected activity",
    body: "Dashboard claim UI and vault activity stream, live, without a public counterparty graph.",
  },
  {
    icon: Shield,
    title: "Relationship Privacy Protocol",
    body: "Commitments + vaults today; modular path to zero-knowledge proofs without a UI rewrite.",
  },
];

export function FeaturesSection() {
  return (
    <Section id="features">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need for private GTM money.
          </h2>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-subtle text-ink">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
