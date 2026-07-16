"use client";

import { motion } from "framer-motion";
import { Container, Section } from "@/components/ui/section";
import { Building2, Heart, Users } from "lucide-react";

const cases = [
  {
    icon: Building2,
    title: "Startup raises",
    body: "Publish a vault-backed campaign. Supporters donate into the vault; you withdraw when ready, no public receive address on your profile.",
  },
  {
    icon: Heart,
    title: "Sensitive giving",
    body: "Medical, emergency, and community funds where donors should not map onto a public wallet graph.",
  },
  {
    icon: Users,
    title: "Protected team money",
    body: "Pay via @username and vault claims, optional notes, no direct wallet-to-wallet in the product flow.",
  },
];

export function UseCasesSection() {
  return (
    <Section id="use-cases">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted">Built for real GTM money</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Who Anonym is for
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-[var(--shadow-card)]"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-subtle">
                <c.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
