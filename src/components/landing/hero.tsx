"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/section";
import { ProductMock } from "@/components/landing/product-mock";
import { EncryptedBricks } from "@/components/landing/encrypted-bricks";
import { ParticleField } from "@/components/landing/particle-field";

export function Hero() {
  return (
    <section className="relative overflow-hidden mesh-soft">
      {/* Full particle network */}
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <ParticleField className="h-full w-full" />
      </div>

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

      {/* Encrypted bricks flanks - desktop only (heavy / clips on mobile) */}
      <div className="pointer-events-none hidden lg:contents">
        <EncryptedBricks side="left" />
        <EncryptedBricks side="right" />
      </div>

      {/* Soft vignette so content stays readable */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-base/30 via-transparent to-base" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[28%] bg-gradient-to-r from-base/85 via-base/25 to-transparent lg:from-base/50" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[28%] bg-gradient-to-l from-base/85 via-base/25 to-transparent lg:from-base/50" />

      <Container className="relative z-10 flex flex-col items-center px-4 pt-12 pb-8 text-center sm:px-6 md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Badge
            variant="outline"
            className="mb-8 max-w-full flex-wrap justify-center gap-1.5 border-line px-2 py-1 text-xs sm:flex-nowrap sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm"
          >
            <span className="shrink-0 rounded-full bg-inverse px-1.5 py-0.5 text-[10px] font-semibold text-on-inverse sm:px-2 sm:text-[11px]">
              New
            </span>
            <span className="text-muted">
              Vault protocol · no direct wallet-to-wallet
            </span>
          </Badge>
        </motion.div>

        <motion.h1
          className="mx-auto max-w-[18ch] text-balance text-[2.5rem] font-bold leading-[1.12] tracking-[-0.035em] text-ink sm:max-w-none sm:text-5xl sm:leading-[1.1] md:text-6xl md:leading-[1.08] lg:text-7xl lg:leading-[1.06]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <span className="block">Private crypto payments.</span>
          <span className="mt-2 block sm:mt-3">Anonymous fundraising.</span>
          <span className="mt-2 block text-[0.72em] font-semibold tracking-[-0.03em] text-muted sm:mt-3 md:text-[0.55em] md:font-medium">
            Protected by Anonym vaults.
          </span>
        </motion.h1>

        <motion.p
          className="mt-7 max-w-xl text-balance text-base leading-relaxed text-muted sm:text-lg sm:leading-relaxed md:mt-8 md:text-xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
        >
          Send to @usernames and raise funds through protocol vaults, never
          direct peer wallets. Relationships stay off the public graph; settlement
          stays on Monad.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3 md:mt-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
        >
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/app">Launch app</Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
            <a href="#zk-demo">See vault demo</a>
          </Button>
        </motion.div>

        <motion.div
          className="mt-10 w-full max-w-5xl overflow-hidden md:mt-16"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <ProductMock />
        </motion.div>
      </Container>
    </section>
  );
}
