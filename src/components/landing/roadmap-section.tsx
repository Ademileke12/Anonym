"use client";

import { motion } from "framer-motion";
import { Container, Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

const phases = [
  {
    phase: "Shipped",
    title: "Vault protocol",
    items: [
      { text: "TransferVault + claim", done: true },
      { text: "CampaignVault donate/withdraw", done: true },
      { text: "No direct P2P in product", done: true },
      { text: "Protected activity dashboard", done: true },
    ],
    tone: "outline" as const,
    active: false,
  },
  {
    phase: "Now",
    title: "On-chain + ZK",
    items: [
      { text: "Deployed vaults on Monad Testnet", done: true },
      { text: "ZK proofs on commitments (anonym-zk-v1)", done: true },
      { text: "Private balances (client reveal)", done: true },
      { text: "Mobile clients (PWA install)", done: true },
      { text: "On-chain SNARK verifier", done: false },
    ],
    tone: "outline" as const,
    active: true,
  },
  {
    phase: "Later",
    title: "Network scale",
    items: [
      { text: "Monad mainnet", done: false },
      { text: "Payroll & grants", done: false },
      { text: "DAO treasury privacy", done: false },
      { text: "Native iOS / Android", done: false },
    ],
    tone: "muted" as const,
    active: false,
  },
];

export function RoadmapSection() {
  return (
    <Section id="roadmap" tone="subtle">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted">Roadmap</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            From private by policy to private by cryptography
          </h2>
          <p className="mt-3 text-sm text-muted">
            Phase Next is active: testnet vaults, commitment proofs, private
            balances, and installable mobile clients.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {phases.map((p, i) => (
            <motion.div
              key={p.phase}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-[var(--radius-card)] border bg-card p-6 shadow-[var(--shadow-card)] ${
                p.active ? "border-ink/20" : "border-line"
              }`}
            >
              <Badge variant={p.tone}>{p.phase}</Badge>
              <h3 className="mt-3 text-lg font-semibold">{p.title}</h3>
              <ul className="mt-4 space-y-2">
                {p.items.map((item) => (
                  <li key={item.text} className="flex gap-2 text-sm text-muted">
                    <span className="shrink-0 text-faint">
                      {item.done ? "✓" : "·"}
                    </span>
                    <span className={item.done ? "text-ink" : undefined}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
