"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Container, Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <Section className="!py-16 md:!py-20">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[var(--radius-card)] border border-line bg-inverse px-8 py-12 text-center text-on-inverse shadow-[var(--shadow-elevated)] md:px-14"
        >
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Private money for builders.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-on-inverse/70">
            Connect a wallet, claim your @username, and move value through
            Anonym vaults, no private keys in the app, no direct P2P.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-base text-ink hover:bg-base/90">
              <Link href="/app">Launch app</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="border-white/20 bg-transparent text-on-inverse hover:bg-white/10"
            >
              <a href="#zk-demo">See vault demo</a>
            </Button>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
