"use client";

import { motion } from "framer-motion";
import { Container, Section } from "@/components/ui/section";
import {
  Eye,
  GitBranch,
  MapPin,
  Shield,
  UserRound,
  Vault,
} from "lucide-react";

/** Same chrome as FeaturesSection cards for a consistent marketing system. */
const cards = [
  {
    icon: GitBranch,
    title: "Public payment graphs",
    body: "Direct wallet-to-wallet sends permanently link who paid whom on every explorer.",
    tag: "Problem",
  },
  {
    icon: MapPin,
    title: "Exposed receive addresses",
    body: "Profiles that publish a 0x address invite tracking of donors, payroll, and treasuries.",
    tag: "Problem",
  },
  {
    icon: Eye,
    title: "Relationships on-chain",
    body: "Competitors and onlookers can map funding rounds, supporters, and private team money.",
    tag: "Problem",
  },
  {
    icon: Vault,
    title: "Vault deposit route",
    body: "Value moves deposit → TransferVault or CampaignVault → claim or withdraw. No product path for direct P2P.",
    tag: "Anonym",
  },
  {
    icon: UserRound,
    title: "Share @username only",
    body: "Public profiles never show a receiving wallet. Resolution stays internal to the protocol.",
    tag: "Anonym",
  },
  {
    icon: Shield,
    title: "Commitments ready for ZK",
    body: "Each deposit uses a commitment hash so future zero-knowledge proofs can slot in without a UI rewrite.",
    tag: "Anonym",
  },
];

export function ProblemSection() {
  return (
    <Section id="problem" tone="subtle">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted">The problem</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Traditional crypto exposes everything.
          </h2>
          <p className="mt-4 text-muted md:text-lg">
            Direct wallet-to-wallet builds a permanent public graph. Anonym routes
            value through protocol vaults instead.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              className="rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-subtle text-ink">
                  <card.icon className="size-5" />
                </div>
                <span
                  className={
                    card.tag === "Anonym"
                      ? "rounded-full bg-chip-green-bg px-2.5 py-0.5 text-[11px] font-medium text-chip-green-fg"
                      : "rounded-full bg-muted-bg px-2.5 py-0.5 text-[11px] font-medium text-muted"
                  }
                >
                  {card.tag}
                </span>
              </div>
              <h3 className="font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {card.body}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
