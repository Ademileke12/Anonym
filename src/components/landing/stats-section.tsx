"use client";

import { motion } from "framer-motion";
import { Container, Section } from "@/components/ui/section";

const stats = [
  { value: "No keys", label: "Sign with your wallet only" },
  { value: "Vaults", label: "No direct wallet-to-wallet" },
  { value: "Monad", label: "Native testnet settlement" },
  { value: "ZK-ready", label: "Commitments → future proofs" },
];

export function StatsSection() {
  return (
    <Section tone="white" className="!py-14 md:!py-16">
      <Container>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-[var(--radius-card)] border border-line bg-card px-4 py-5 text-center shadow-[var(--shadow-card)]"
            >
              <p className="text-lg font-bold tracking-tight md:text-xl">{s.value}</p>
              <p className="mt-1 text-xs text-muted md:text-sm">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
