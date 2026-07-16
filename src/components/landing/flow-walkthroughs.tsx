"use client";

import { useEffect, useState, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container, Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { AnonymMark } from "@/components/brand/logo";
import {
  ArrowRight,
  Gift,
  Inbox,
  Landmark,
  Send,
  Shield,
  UserRound,
  Vault,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FlowStep = {
  id: string;
  label: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
};

const TRANSFER_STEPS: FlowStep[] = [
  {
    id: "resolve",
    label: "Resolve @username",
    detail: "You type @alice. No public wallet is shown on either side.",
    icon: UserRound,
  },
  {
    id: "commit",
    label: "Create commitment",
    detail: "commitment = hash(recipient, salt). Ready for future ZK proofs.",
    icon: Shield,
  },
  {
    id: "deposit",
    label: "Deposit to vault",
    detail: "MON lands in TransferVault, never Alice's public address.",
    icon: Vault,
  },
  {
    id: "claim",
    label: "Recipient claims",
    detail: "Alice opens the dashboard and claims when she chooses.",
    icon: Inbox,
  },
];

const CAMPAIGN_STEPS: FlowStep[] = [
  {
    id: "create",
    label: "Publish campaign",
    detail: "Goal, deadline, story. Campaign vault registers on create.",
    icon: Landmark,
  },
  {
    id: "share",
    label: "Share the link",
    detail: "Supporters open the campaign page, not your receive address.",
    icon: Send,
  },
  {
    id: "donate",
    label: "Donate Securely",
    detail: "Contributions deposit into the campaign vault (anonymous optional).",
    icon: Gift,
  },
  {
    id: "withdraw",
    label: "Owner withdraws",
    detail: "You withdraw vault balance when ready, not per-donation P2P.",
    icon: Wallet,
  },
];

const STEP_MS = 3200;

function FlowStage({
  steps,
  active,
  variant,
}: {
  steps: FlowStep[];
  active: number;
  variant: "transfer" | "campaign";
}) {
  const step = steps[active];

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AnonymMark size={22} />
          <div>
            <p className="text-sm font-semibold">
              {variant === "transfer" ? "Protected transfer" : "Campaign vault"}
            </p>
            <p className="text-[11px] text-muted">Live protocol path</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Shield className="size-2.5" />
          Vaults
        </Badge>
      </div>

      {/* Horizontal step rail */}
      <div className="mb-6 flex items-center justify-between gap-1">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done = i < active;
          const current = i === active;
          return (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl border transition-colors",
                    current
                      ? "border-ink bg-inverse text-on-inverse shadow-[var(--shadow-xs)]"
                      : done
                        ? "border-line bg-subtle text-ink"
                        : "border-line bg-card text-faint",
                  )}
                  animate={current ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  transition={{ duration: 1.2, repeat: current ? Infinity : 0 }}
                >
                  <Icon className="size-4" />
                </motion.div>
                <span
                  className={cn(
                    "hidden text-center text-[10px] font-medium sm:block",
                    current ? "text-ink" : "text-faint",
                  )}
                >
                  {s.label.split(" ")[0]}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <div className="mx-1 mb-5 hidden h-px flex-1 bg-line sm:block">
                  <motion.div
                    className="h-full bg-ink"
                    initial={{ width: "0%" }}
                    animate={{ width: i < active ? "100%" : "0%" }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Animated panel */}
      <div className="relative min-h-[168px] overflow-hidden rounded-xl border border-line bg-subtle/60 p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-card text-ink shadow-[var(--shadow-xs)]">
                <step.icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs text-muted">Step {active + 1} of {steps.length}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted">{step.detail}</p>

            {variant === "transfer" ? (
              <TransferVisual index={active} />
            ) : (
              <CampaignVisual index={active} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress bar */}
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
    </div>
  );
}

function TransferVisual({ index }: { index: number }) {
  const nodes = [
    { label: "You", sub: "Sender" },
    { label: "Vault", sub: "TransferVault" },
    { label: "@alice", sub: "Claims" },
  ];
  const lit =
    index === 0 ? 0 : index === 1 || index === 2 ? 1 : index === 3 ? 2 : 0;

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card px-3 py-3">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex flex-1 items-center gap-1">
          <motion.div
            className={cn(
              "flex-1 rounded-lg border px-2 py-2 text-center",
              i === lit
                ? "border-ink bg-inverse text-on-inverse"
                : "border-line bg-subtle text-muted",
            )}
            animate={i === lit ? { y: [0, -2, 0] } : { y: 0 }}
            transition={{ duration: 1.1, repeat: i === lit ? Infinity : 0 }}
          >
            <p className="text-[11px] font-semibold">{n.label}</p>
            <p className="text-[9px] opacity-70">{n.sub}</p>
          </motion.div>
          {i < nodes.length - 1 ? (
            <ArrowRight
              className={cn(
                "size-3.5 shrink-0",
                i < lit ? "text-ink" : "text-faint",
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CampaignVisual({ index }: { index: number }) {
  const pct = index === 0 ? 8 : index === 1 ? 18 : index === 2 ? 62 : 100;
  return (
    <div className="space-y-2 rounded-xl border border-line bg-card p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium">Seed round · Shield Labs</span>
        <Badge variant="green" dot className="text-[9px]">
          {index < 3 ? "Live" : "Funded"}
        </Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted-bg">
        <motion.div
          className="h-full rounded-full bg-inverse"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>
          {index < 2 ? "0" : index === 2 ? "3.1k" : "5k"} / 5k MON in vault
        </span>
        <span>
          {index === 3 ? "Withdraw available" : "Donate Securely"}
        </span>
      </div>
    </div>
  );
}

function useAutoStep(length: number, paused: boolean, ms = STEP_MS) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => {
      setActive((i) => (i + 1) % length);
    }, ms);
    return () => window.clearTimeout(t);
  }, [active, paused, length, ms]);
  return [active, setActive] as const;
}

function FlowWalkthroughBlock({
  eyebrow,
  title,
  description,
  steps,
  variant,
  tone = "white",
  id,
}: {
  eyebrow: string;
  title: string;
  description: string;
  steps: FlowStep[];
  variant: "transfer" | "campaign";
  tone?: "white" | "subtle";
  id: string;
}) {
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useAutoStep(steps.length, paused);

  return (
    <Section id={id} tone={tone}>
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-muted md:text-lg">{description}</p>
        </div>

        <div
          className="mx-auto mt-8 grid max-w-5xl gap-5 sm:mt-12 lg:grid-cols-[1fr_1.15fr] lg:items-stretch lg:gap-6"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="order-1 lg:order-2">
            <FlowStage steps={steps} active={active} variant={variant} />
          </div>
          <ol className="order-2 flex flex-col justify-center gap-2 lg:order-1">
            {steps.map((s, i) => {
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
                        : "border-transparent bg-transparent hover:bg-card/70",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
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
          Hover to pause · click a step to jump
        </p>
      </Container>
    </Section>
  );
}

/** Animated walkthrough: protected transfer path */
export function TransferFlowSection() {
  return (
    <FlowWalkthroughBlock
      id="transfer-flow"
      tone="white"
      eyebrow="Walkthrough · Transfers"
      title="How a protected transfer works"
      description="Four steps. Zero direct wallet-to-wallet hops. The recipient claims from their dashboard."
      steps={TRANSFER_STEPS}
      variant="transfer"
    />
  );
}

/** Animated walkthrough: campaign raise path */
export function CampaignFlowSection() {
  return (
    <FlowWalkthroughBlock
      id="campaign-flow"
      tone="subtle"
      eyebrow="Walkthrough · Fundraising"
      title="How vault-backed raises work"
      description="Publish, share, collect into a campaign vault, then withdraw when you are ready."
      steps={CAMPAIGN_STEPS}
      variant="campaign"
    />
  );
}
