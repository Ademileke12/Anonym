"use client";

import { motion } from "framer-motion";
import { Container, Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

const phases = [
  {
    phase: "Now",
    title: "Vault protocol",
    items: [
      "TransferVault + claim",
      "CampaignVault donate/withdraw",
      "No direct P2P in product",
      "Protected activity dashboard",
    ],
    tone: "green" as const,
  },
  {
    phase: "Next",
    title: "On-chain + ZK",
    items: [
      "Deployed vaults on testnet",
      "ZK proofs on commitments",
      "Private balances",
      "Mobile clients",
    ],
    tone: "blue" as const,
  },
  {
    phase: "Later",
    title: "Network scale",
    items: [
      "Monad mainnet",
      "Payroll & grants",
      "DAO treasury privacy",
      "Creator memberships",
    ],
    tone: "purple" as const,
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
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {phases.map((p, i) => (
            <motion.div
              key={p.phase}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-[var(--shadow-card)]"
            >
              <Badge variant={p.tone}>{p.phase}</Badge>
              <h3 className="mt-3 text-lg font-semibold">{p.title}</h3>
              <ul className="mt-4 space-y-2">
                {p.items.map((item) => (
                  <li key={item} className="text-sm text-muted">
                    · {item}
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
