"use client";

import { useEffect, useState, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Container, Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnonymMark } from "@/components/brand/logo";
import {
  Eye,
  KeyRound,
  Lock,
  Shield,
  FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  label: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
};

const STEPS: Step[] = [
  {
    id: "privacy",
    label: "Default is private",
    detail:
      "Public profiles and explorers never show full payment relationships. The graph stays incomplete by design.",
    icon: Shield,
  },
  {
    id: "backdoor",
    label: "Open Backdoor",
    detail:
      "Only you (or a paid unlock) can open Backdoor for your wallet, a controlled reveal, not public broadcast.",
    icon: KeyRound,
  },
  {
    id: "reveal",
    label: "See private details",
    detail:
      "Incoming vault deposits, counterparties (when not anonymous), notes, and campaign support appear for your session only.",
    icon: Eye,
  },
  {
    id: "export",
    label: "Export or close",
    detail:
      "Download your revealed history for audits, or leave Backdoor closed so the app stays relationship-private again.",
    icon: FileJson,
  },
];

const STEP_MS = 3400;

export function BackdoorWalkthroughSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => {
      setActive((i) => (i + 1) % STEPS.length);
    }, STEP_MS);
    return () => window.clearTimeout(t);
  }, [active, paused]);

  const step = STEPS[active];

  return (
    <Section id="backdoor" tone="white">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted">Walkthrough · Backdoor</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            What is Backdoor?
          </h2>
          <p className="mt-3 text-muted md:text-lg">
            Anonym keeps relationships private by default. Backdoor is the
            optional, authenticated reveal of your own private payment details -
            not a public leak of the graph.
          </p>
        </div>

        <div
          className="mx-auto mt-10 grid max-w-5xl gap-6 lg:mt-12 lg:grid-cols-[1fr_1.15fr] lg:items-stretch"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
              <div className="mb-5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AnonymMark size={22} />
                  <div>
                    <p className="text-sm font-semibold">Backdoor</p>
                    <p className="text-[11px] text-muted">Controlled reveal</p>
                  </div>
                </div>
                <Badge variant="purple" className="text-[10px]">
                  Optional
                </Badge>
              </div>

              {/* Stage mock */}
              <div className="relative min-h-[200px] overflow-hidden rounded-xl border border-line bg-subtle/70 p-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28 }}
                    className="space-y-4"
                  >
                    {active === 0 && (
                      <div className="space-y-2 text-center">
                        <Lock className="mx-auto size-8 text-muted" />
                        <p className="text-sm font-semibold">Public surface</p>
                        <p className="text-xs text-muted">
                          @username · campaigns · no receive address
                        </p>
                        <div className="mx-auto mt-3 max-w-xs rounded-lg border border-dashed border-line bg-card px-3 py-2 text-[10px] text-faint">
                          Payment graph: incomplete · protected
                        </div>
                      </div>
                    )}
                    {active === 1 && (
                      <div className="space-y-3 text-center">
                        <KeyRound className="mx-auto size-8 text-ink" />
                        <p className="text-sm font-semibold">Open Backdoor</p>
                        <div className="mx-auto flex max-w-xs justify-center gap-2">
                          <span className="rounded-full bg-inverse px-3 py-1.5 text-[11px] font-medium text-on-inverse">
                            Free test open
                          </span>
                          <span className="rounded-full border border-line px-3 py-1.5 text-[11px] text-muted">
                            or 1000 MON
                          </span>
                        </div>
                        <p className="text-xs text-muted">
                          Wallet session required · unlock is per you
                        </p>
                      </div>
                    )}
                    {active === 2 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted">
                          Revealed for your wallet
                        </p>
                        {[
                          "In · 25 MON · claimable · vault",
                          "In · 10 MON · campaign · anonymous",
                          "Out · 5 MON · to @bob · deposited",
                        ].map((row, i) => (
                          <motion.div
                            key={row}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="rounded-lg border border-line bg-card px-3 py-2 text-[11px] font-medium"
                          >
                            {row}
                          </motion.div>
                        ))}
                      </div>
                    )}
                    {active === 3 && (
                      <div className="space-y-3 text-center">
                        <FileJson className="mx-auto size-8 text-ink" />
                        <p className="text-sm font-semibold">Export JSON</p>
                        <p className="text-xs text-muted">
                          Audit trail for you, still not a public explorer dump
                        </p>
                        <div className="mx-auto rounded-full bg-subtle px-4 py-2 font-mono text-[10px] text-muted">
                          anonym-backdoor.json
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted-bg">
                  <motion.div
                    key={`bar-${active}`}
                    className="h-full bg-inverse"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/app/backdoor">Open Backdoor in app</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <a href="#transfer-flow">How vaults work</a>
                </Button>
              </div>
            </div>
          </div>

          <ol className="order-2 flex flex-col justify-center gap-2 lg:order-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = active === i;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[var(--radius-panel)] border px-4 py-3.5 text-left transition-all",
                      isActive
                        ? "border-ink/15 bg-card shadow-[var(--shadow-card)]"
                        : "border-transparent hover:bg-card/70",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                        isActive
                          ? "bg-inverse text-on-inverse"
                          : "bg-subtle text-muted",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{s.label}</p>
                      <p className="mt-0.5 text-sm text-muted">{s.detail}</p>
                      {isActive && !paused ? (
                        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted-bg">
                          <motion.div
                            key={`p-${active}`}
                            className="h-full rounded-full bg-inverse"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{
                              duration: STEP_MS / 1000,
                              ease: "linear",
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="mt-4 text-center text-xs text-faint">
          Hover to pause · click a step · Backdoor never publishes to the chain
          graph
        </p>
      </Container>
    </Section>
  );
}
