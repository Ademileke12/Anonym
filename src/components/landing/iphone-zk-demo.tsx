"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container, Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnonymMark } from "@/components/brand/logo";
import {
  runShieldedDemo,
  ZK_DEMO_COPY,
  type ZkDemoStep,
} from "@/services/privacy";
import { Inbox, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * iPhone frame - protected vault send + ZK-ready commitment demo.
 * Theme-aware via CSS tokens (light/dark).
 */
export function IphoneZkDemoSection() {
  const [step, setStep] = useState<ZkDemoStep>("idle");
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);

  async function play() {
    if (running) return;
    setRunning(true);
    setStep("idle");
    setMeta({});
    try {
      await runShieldedDemo({
        amountLabel: "25 MON",
        onStep: (s, m) => {
          setStep(s);
          if (m) setMeta(m);
        },
      });
    } finally {
      setRunning(false);
    }
  }

  const activeCopy =
    step !== "idle" ? ZK_DEMO_COPY[step as Exclude<ZkDemoStep, "idle">] : null;

  return (
    <Section id="zk-demo" tone="subtle">
      <Container>
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <Badge
              variant="outline"
              className="mb-6 gap-2 border-line px-3 py-1.5 text-sm"
            >
              <span className="rounded-full bg-inverse px-2 py-0.5 text-[11px] font-semibold text-on-inverse">
                Demo
              </span>
              <span className="text-muted">Protected vault send · ZK-ready</span>
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Deposit, commit, claim, not wallet-to-wallet.
            </h2>
            <p className="mt-4 text-muted md:text-lg">
              The phone demo walks the same path as the product: resolve
              @username, deposit into TransferVault with a commitment, settle on
              Monad, then leave the recipient a claim on their dashboard. ZK
              proofs plug into the same steps when circuits ship.
            </p>
            <ul className="mt-6 space-y-2 text-left text-sm text-muted">
              <li className="flex gap-2">
                <Shield className="mt-0.5 size-4 shrink-0 text-ink" />
                No public receive address, only @username
              </li>
              <li className="flex gap-2">
                <Shield className="mt-0.5 size-4 shrink-0 text-ink" />
                Commitment hash ready for future zero-knowledge proofs
              </li>
              <li className="flex gap-2">
                <Inbox className="mt-0.5 size-4 shrink-0 text-ink" />
                Recipient claims from dashboard, never a direct P2P hop
              </li>
            </ul>
            <Button
              className="mt-8 w-full sm:w-auto"
              size="lg"
              onClick={() => void play()}
              disabled={running}
            >
              {running ? (
                <>
                  <Loader2 className="animate-spin" /> Running demo…
                </>
              ) : (
                "Play protected send"
              )}
            </Button>
          </div>

          {/* iPhone frame - show first on mobile for engagement */}
          <div className="order-1 mx-auto w-full max-w-[280px] sm:max-w-[300px] lg:order-2">
            <div
              className={cn(
                "relative rounded-[2.5rem] border-[10px] border-ink/90 bg-card p-2 shadow-[var(--shadow-float)]",
                "dark:border-zinc-200/90",
              )}
            >
              <div className="absolute left-1/2 top-3 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-ink dark:bg-zinc-900" />
              <div className="relative overflow-hidden rounded-[1.85rem] bg-base">
                <div className="flex h-[540px] flex-col">
                  <div className="flex items-center justify-between px-5 pb-1 pt-10 text-[11px] font-medium text-ink">
                    <span>9:41</span>
                    <span className="opacity-60">Anonym</span>
                  </div>

                  <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                    <AnonymMark size={22} />
                    <div>
                      <p className="text-sm font-semibold">Protected send</p>
                      <p className="text-[11px] text-muted">
                        TransferVault · protocol v1
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-4 py-4">
                    <div className="rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-xs)]">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] text-muted">To</p>
                        <Badge
                          variant="outline"
                          className="gap-1 px-1.5 py-0 text-[9px]"
                        >
                          <Shield className="size-2.5" />
                          No wallet shown
                        </Badge>
                      </div>
                      <p className="font-mono text-sm font-medium">@alice</p>
                      <p className="mt-3 text-[11px] text-muted">Amount</p>
                      <p className="text-2xl font-bold tracking-tight">25 MON</p>
                      <p className="mt-2 text-[11px] text-muted">Note</p>
                      <p className="text-sm text-ink/80">Private thank-you ✨</p>
                      <p className="mt-3 rounded-lg bg-subtle px-2 py-1.5 text-[10px] text-muted">
                        Route: you → TransferVault → Alice claims
                      </p>
                    </div>

                    <div className="mt-4 flex-1">
                      <AnimatePresence mode="wait">
                        {step === "idle" ? (
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex h-full flex-col items-center justify-center text-center"
                          >
                            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-subtle">
                              <Shield className="size-5 text-ink" />
                            </div>
                            <p className="text-sm font-medium">
                              Ready to deposit
                            </p>
                            <p className="mt-1 max-w-[200px] text-xs text-muted">
                              Resolve → vault deposit → commitment → claimable
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="space-y-2.5"
                          >
                            {(
                              [
                                "encrypting",
                                "proving",
                                "settling",
                                "complete",
                              ] as const
                            ).map((s, i) => {
                              const order = [
                                "encrypting",
                                "proving",
                                "settling",
                                "complete",
                              ] as const;
                              const idx = order.indexOf(step);
                              const done =
                                order.indexOf(s) < idx || step === "complete";
                              const active = s === step;
                              return (
                                <div
                                  key={s}
                                  className={cn(
                                    "rounded-xl border px-3 py-2.5 transition-colors",
                                    active
                                      ? "border-ink/20 bg-card shadow-[var(--shadow-card)]"
                                      : done
                                        ? "border-line bg-subtle/80"
                                        : "border-transparent bg-transparent opacity-40",
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                                        done || active
                                          ? "bg-inverse text-on-inverse"
                                          : "bg-muted-bg text-muted",
                                      )}
                                    >
                                      {i + 1}
                                    </span>
                                    <p className="text-xs font-semibold">
                                      {ZK_DEMO_COPY[s].title}
                                    </p>
                                    {active && step !== "complete" ? (
                                      <Loader2 className="ml-auto size-3.5 animate-spin text-muted" />
                                    ) : null}
                                  </div>
                                  {active ? (
                                    <p className="mt-1.5 pl-7 text-[11px] leading-relaxed text-muted">
                                      {activeCopy?.body}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            })}
                            {step === "complete" ? (
                              <div className="space-y-2">
                                {meta.commitment ? (
                                  <p className="rounded-lg bg-chip-green-bg px-3 py-2 font-mono text-[10px] text-chip-green-fg">
                                    commitment {meta.commitment}
                                  </p>
                                ) : null}
                                <div className="flex items-center gap-2 rounded-xl border border-chip-yellow-fg/20 bg-chip-yellow-bg/40 px-3 py-2">
                                  <Inbox className="size-3.5 shrink-0 text-chip-yellow-fg" />
                                  <p className="text-[10px] font-medium text-ink">
                                    @alice · 25 MON claimable on dashboard
                                  </p>
                                </div>
                              </div>
                            ) : null}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      type="button"
                      onClick={() => void play()}
                      disabled={running}
                      className="mb-2 mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-sm font-semibold text-primary-fg disabled:opacity-60"
                    >
                      {running ? (
                        "Depositing…"
                      ) : step === "complete" ? (
                        "Run again"
                      ) : (
                        <>
                          <Shield className="size-3.5" />
                          Send via vault
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
