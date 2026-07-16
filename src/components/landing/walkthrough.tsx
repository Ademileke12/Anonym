"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container, Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { AnonymMark } from "@/components/brand/logo";
import {
  Wallet,
  UserRound,
  HeartHandshake,
  Gift,
  LayoutDashboard,
  Hand,
  Shield,
  Inbox,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  id: number;
  label: string;
  detail: string;
  icon: typeof Wallet;
  /** data-walk-target on the control the hand should hit */
  target: string;
};

const steps: Step[] = [
  {
    id: 1,
    label: "Connect wallet",
    detail: "MetaMask, Rabby, or WalletConnect, no private keys in the app.",
    icon: Wallet,
    target: "connect",
  },
  {
    id: 2,
    label: "Claim @username",
    detail: "Your public handle. Receiving wallet stays private.",
    icon: UserRound,
    target: "profile",
  },
  {
    id: 3,
    label: "Send via vault",
    detail: "Deposit to TransferVault for @username — never direct P2P.",
    icon: Send,
    target: "send",
  },
  {
    id: 4,
    label: "Launch campaign",
    detail: "Vault registers on create. No public receive address on the page.",
    icon: HeartHandshake,
    target: "campaign",
  },
  {
    id: 5,
    label: "Donate Securely",
    detail: "Supporters contribute to the campaign vault, not the owner wallet.",
    icon: Gift,
    target: "donate",
  },
  {
    id: 6,
    label: "Claim on dashboard",
    detail: "Claimable transfers + protected activity — claim or withdraw.",
    icon: LayoutDashboard,
    target: "dash",
  },
];

const STEP_MS = 4000;
/** Wait for layout + hand spring before the tap */
const CLICK_AT = 1750;
const CLICK_END = 2100;

const SIDE_NAV = ["Dashboard", "Send", "Receive", "Campaigns"] as const;

/**
 * Hand cursor. (x, y) is the center of the control in stage coordinates.
 * Inner offset centers the circular hand badge on that point.
 */
function AnimatedHand({
  x,
  y,
  clicking,
  ready,
}: {
  x: number;
  y: number;
  clicking: boolean;
  ready: boolean;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute z-40"
      initial={false}
      animate={{
        x,
        y,
        opacity: ready ? 1 : 0,
      }}
      transition={{
        x: { type: "spring", stiffness: 160, damping: 22, mass: 0.5 },
        y: { type: "spring", stiffness: 160, damping: 22, mass: 0.5 },
        opacity: { duration: 0.18 },
      }}
      style={{ left: 0, top: 0 }}
    >
      {/* Center badge on (x,y); slight up-bias so hand looks like it taps from above */}
      <motion.div
        className="relative -translate-x-1/2 -translate-y-[55%]"
        animate={{ scale: clicking ? 0.88 : 1 }}
        transition={{ duration: 0.12 }}
      >
        <AnimatePresence>
          {clicking ? (
            <motion.span
              key="ripple"
              className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink/25 bg-ink/5"
              initial={{ scale: 0.35, opacity: 0.75 }}
              animate={{ scale: 1.75, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            />
          ) : null}
        </AnimatePresence>
        <div
          className={cn(
            "relative flex size-11 items-center justify-center rounded-full bg-card shadow-[0_4px_16px_rgba(0,0,0,0.2)] ring-1 ring-line",
            clicking && "ring-2 ring-ink/25",
          )}
        >
          <Hand
            className={cn(
              "size-[22px] text-ink",
              clicking ? "fill-ink/20" : "fill-card",
            )}
            strokeWidth={1.75}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function navActiveIndex(target: string) {
  if (target === "dash") return 0;
  if (target === "send") return 1;
  if (target === "profile" || target === "connect") return -1;
  if (target === "campaign" || target === "donate") return 3;
  return 0;
}

function WalkthroughStage({
  active,
  clicking,
}: {
  active: number;
  clicking: boolean;
}) {
  const step = steps[active];
  const lit = (id: string) => step.target === id && clicking;
  const navIdx = navActiveIndex(step.target);

  const stageRef = useRef<HTMLDivElement>(null);
  const [hand, setHand] = useState({ x: 0, y: 0, ready: false });

  const measureTarget = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const el = stage.querySelector<HTMLElement>(
      `[data-walk-target="${step.target}"]`,
    );
    if (!el) return;

    const stageBox = stage.getBoundingClientRect();
    const elBox = el.getBoundingClientRect();

    // Center of the interactive control, relative to stage
    const x = elBox.left - stageBox.left + elBox.width / 2;
    const y = elBox.top - stageBox.top + elBox.height / 2;

    setHand({ x, y, ready: true });
  }, [step.target]);

  // Remeasure after paint when step content changes
  useLayoutEffect(() => {
    setHand((h) => ({ ...h, ready: false }));
    // Wait one frame so AnimatePresence content is in the DOM
    const raf = requestAnimationFrame(() => {
      measureTarget();
      // Second pass after layout settles (fonts / progress bars)
      window.setTimeout(measureTarget, 80);
      window.setTimeout(measureTarget, 220);
    });
    return () => cancelAnimationFrame(raf);
  }, [active, measureTarget]);

  // Keep aligned on resize
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => measureTarget());
    ro.observe(stage);
    window.addEventListener("resize", measureTarget);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureTarget);
    };
  }, [measureTarget]);

  // Remeasure when click pulse starts (scale animation can shift slightly)
  useEffect(() => {
    if (clicking) measureTarget();
  }, [clicking, measureTarget]);

  return (
    <div
      ref={stageRef}
      className="relative h-full min-h-[400px] overflow-hidden rounded-[var(--radius-card)] border border-line bg-subtle shadow-[var(--shadow-elevated)]"
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

      <div className="relative z-10 flex h-full flex-col p-3 sm:p-4">
        {/* Top bar */}
        <div className="mb-3 flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2.5 shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-2">
            <AnonymMark size={22} />
            <span className="text-sm font-semibold tracking-tight">Anonym</span>
            <Badge
              variant="outline"
              className="hidden gap-1 text-[10px] sm:inline-flex"
            >
              <Shield className="size-2.5" />
              Vaults
            </Badge>
          </div>
          <motion.button
            type="button"
            data-walk-target="connect"
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
              step.target === "connect"
                ? "bg-inverse text-on-inverse ring-2 ring-ink/10 ring-offset-2 ring-offset-card"
                : "bg-muted-bg text-muted",
              lit("connect") && "scale-95 ring-ink/25",
            )}
            animate={
              step.target === "connect" && !clicking
                ? {
                    boxShadow: [
                      "0 0 0 0 rgba(10,10,10,0)",
                      "0 0 0 6px rgba(10,10,10,0.08)",
                      "0 0 0 0 rgba(10,10,10,0)",
                    ],
                  }
                : {}
            }
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            {step.target === "connect" ? "Connect wallet" : "0x7a…c2"}
          </motion.button>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-[96px_1fr]">
          <div className="hidden flex-col gap-1 rounded-xl border border-line bg-card p-2 sm:flex">
            {SIDE_NAV.map((item, i) => (
              <div
                key={item}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-[11px] font-medium",
                  navIdx === i ? "bg-inverse text-on-inverse" : "text-muted",
                )}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-line bg-card p-3 shadow-[var(--shadow-xs)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="flex flex-1 flex-col"
                onAnimationComplete={measureTarget}
              >
                {step.target === "connect" && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-subtle">
                      <Wallet className="size-5 text-ink" />
                    </div>
                    <p className="text-sm font-semibold">Sign in with wallet</p>
                    <p className="max-w-[220px] text-xs text-muted">
                      No email. No password. Never paste a private key.
                    </p>
                    <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                      {["MetaMask", "Rabby", "WalletConnect"].map((w) => (
                        <span
                          key={w}
                          className="rounded-full border border-line px-2.5 py-1 text-[10px] text-muted"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-faint">
                      Tap <span className="font-medium text-muted">Connect wallet</span>{" "}
                      above →
                    </p>
                  </div>
                )}

                {step.target === "profile" && (
                  <div className="space-y-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted">
                        Onboarding
                      </p>
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Shield className="size-2.5" />
                        Protected by Anonym
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-muted">
                      Account type
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {["Regular", "Startup"].map((t, i) => (
                        <motion.div
                          key={t}
                          data-walk-target={i === 0 ? "profile" : undefined}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-center text-sm font-medium",
                            i === 0
                              ? "border-ink bg-inverse text-on-inverse"
                              : "border-line text-muted",
                            lit("profile") && i === 0 && "scale-95",
                          )}
                        >
                          {t}
                        </motion.div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-line bg-subtle px-3 py-2 font-mono text-sm text-muted">
                      @alex<span className="animate-pulse">|</span>
                    </div>
                    <p className="text-[10px] text-faint">
                      Public profile shares @alex — never a receive address.
                    </p>
                  </div>
                )}

                {step.target === "send" && (
                  <div className="flex h-full flex-col space-y-2.5 py-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Protected transfer</p>
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Shield className="size-2.5" />
                        Vault
                      </Badge>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-muted">To</p>
                      <div className="rounded-lg border border-line bg-subtle px-3 py-2 font-mono text-sm">
                        @bob
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-muted">Amount</p>
                      <div className="rounded-lg border border-line bg-subtle px-3 py-2 text-sm font-semibold">
                        10 MON
                      </div>
                    </div>
                    <p className="text-[10px] leading-relaxed text-faint">
                      Deposit → TransferVault · Bob claims from dashboard
                    </p>
                    <div className="mt-auto pt-2">
                      <motion.div
                        data-walk-target="send"
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-full bg-inverse py-2.5 text-center text-xs font-medium text-on-inverse",
                          lit("send") && "scale-95 opacity-90",
                        )}
                      >
                        <Shield className="size-3" />
                        Send privately
                      </motion.div>
                    </div>
                  </div>
                )}

                {step.target === "campaign" && (
                  <div className="flex h-full flex-col space-y-2.5 py-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">New campaign</p>
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Shield className="size-2.5" />
                        Vault-backed
                      </Badge>
                    </div>
                    <div className="h-8 rounded-lg border border-line bg-subtle px-3 text-[11px] leading-8 text-muted">
                      Seed round · Shield Labs
                    </div>
                    <div className="h-12 rounded-lg border border-line bg-subtle" />
                    <div className="flex gap-2">
                      <div className="h-8 flex-1 rounded-lg border border-line bg-subtle px-2 text-[10px] leading-8 text-muted">
                        Goal 5k MON
                      </div>
                      <div className="h-8 flex-1 rounded-lg border border-line bg-subtle px-2 text-[10px] leading-8 text-muted">
                        30 days
                      </div>
                    </div>
                    <p className="rounded-lg bg-chip-green-bg/50 px-2 py-1.5 text-[10px] text-chip-green-fg">
                      Campaign vault registers on publish — no public receive
                      field
                    </p>
                    <div className="mt-auto pt-1">
                      <motion.div
                        data-walk-target="campaign"
                        className={cn(
                          "rounded-full bg-inverse py-2.5 text-center text-xs font-medium text-on-inverse",
                          lit("campaign") && "scale-95 opacity-90",
                        )}
                      >
                        Publish campaign
                      </motion.div>
                    </div>
                  </div>
                )}

                {step.target === "donate" && (
                  <div className="flex h-full flex-col space-y-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Support raise</p>
                      <Badge variant="green" dot>
                        Live
                      </Badge>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted-bg">
                      <motion.div
                        className="h-full rounded-full bg-inverse"
                        initial={{ width: "38%" }}
                        animate={{ width: clicking ? "52%" : "42%" }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-[10px] text-faint">
                      2.1k / 5k MON · vault balance (not owner wallet)
                    </p>
                    <div className="flex gap-2">
                      <span className="rounded-full bg-chip-purple-bg px-2.5 py-1 text-[11px] font-medium text-chip-purple-fg">
                        Anonymous
                      </span>
                      <span className="rounded-full bg-muted-bg px-2.5 py-1 text-[11px] text-muted">
                        25 MON
                      </span>
                    </div>
                    <div className="mt-auto space-y-2 pt-1">
                      <motion.div
                        data-walk-target="donate"
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-full bg-inverse py-2.5 text-center text-xs font-medium text-on-inverse",
                          lit("donate") && "scale-95",
                        )}
                      >
                        <Shield className="size-3" />
                        Donate Securely
                      </motion.div>
                      <p className="text-center text-[10px] text-faint">
                        Protected by Anonym · contribution → campaign vault
                      </p>
                    </div>
                  </div>
                )}

                {step.target === "dash" && (
                  <div className="space-y-2.5 py-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Dashboard</p>
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Shield className="size-2.5" />
                        Protected
                      </Badge>
                    </div>

                    <motion.div
                      className={cn(
                        "rounded-xl border border-chip-yellow-fg/20 bg-gradient-to-br from-chip-yellow-bg/50 to-subtle p-2.5",
                        lit("dash") && "ring-2 ring-ink/15",
                      )}
                      animate={
                        !clicking
                          ? {
                              boxShadow: [
                                "0 0 0 0 rgba(0,0,0,0)",
                                "0 0 0 4px rgba(0,0,0,0.04)",
                                "0 0 0 0 rgba(0,0,0,0)",
                              ],
                            }
                          : {}
                      }
                      transition={{ duration: 1.6, repeat: Infinity }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-chip-yellow-bg text-chip-yellow-fg">
                            <Inbox className="size-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold">
                              2 protected transfers
                            </p>
                            <p className="text-[10px] text-muted">
                              35 MON ready to claim
                            </p>
                          </div>
                        </div>
                        <motion.span
                          data-walk-target="dash"
                          className={cn(
                            "shrink-0 rounded-full bg-inverse px-2.5 py-1.5 text-[10px] font-medium text-on-inverse",
                            lit("dash") && "scale-95",
                          )}
                        >
                          Claim all
                        </motion.span>
                      </div>
                    </motion.div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        ["Claimable", "35"],
                        ["Raised", "2.1k"],
                        ["Sent", "120"],
                      ].map(([label, v]) => (
                        <div
                          key={label}
                          className="rounded-lg border border-line bg-subtle px-1.5 py-1.5 text-center"
                        >
                          <p className="text-[9px] uppercase tracking-wide text-faint">
                            {label}
                          </p>
                          <p className="text-[11px] font-semibold tabular-nums">
                            {v}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-medium text-muted">
                        Protected activity
                      </p>
                      <div className="space-y-1">
                        {[
                          {
                            t: "Protected receive 25 MON",
                            s: "Ready to claim",
                          },
                          { t: "Contributed 10 MON", s: "Vault deposit" },
                          { t: "Protected send 15 MON", s: "Anonymous" },
                        ].map((row, i) => (
                          <motion.div
                            key={row.t}
                            className="flex items-center justify-between gap-2 rounded-md bg-muted-bg/80 px-2 py-1.5"
                            initial={{ opacity: 0.4, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                          >
                            <p className="truncate text-[10px] font-medium">
                              {row.t}
                            </p>
                            <p className="shrink-0 text-[9px] text-faint">
                              {row.s}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatedHand
        x={hand.x}
        y={hand.y}
        clicking={clicking}
        ready={hand.ready}
      />
    </div>
  );
}

export function WalkthroughSection() {
  const [active, setActive] = useState(0);
  const [clicking, setClicking] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    setClicking(false);
    // Let hand move into place before tap
    const clickTimer = window.setTimeout(() => setClicking(true), CLICK_AT);
    const releaseTimer = window.setTimeout(() => setClicking(false), CLICK_END);
    const nextTimer = window.setTimeout(() => {
      setActive((i) => (i + 1) % steps.length);
    }, STEP_MS);

    return () => {
      window.clearTimeout(clickTimer);
      window.clearTimeout(releaseTimer);
      window.clearTimeout(nextTimer);
    };
  }, [active, paused]);

  return (
    <Section id="walkthrough" tone="subtle">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted">Animated walkthrough</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            From connect to claim, vaults only.
          </h2>
          <p className="mt-3 text-muted md:text-lg">
            Connect, claim @username, send via TransferVault, raise with a
            campaign vault, donate securely, then claim on the dashboard.
          </p>
        </div>

        <div
          className="mx-auto mt-8 grid max-w-5xl gap-6 sm:mt-12 lg:grid-cols-[1fr_1.25fr] lg:items-stretch lg:gap-8"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* On mobile: stage first, then step list */}
          <div className="order-1 lg:order-2">
            <WalkthroughStage active={active} clicking={clicking} />
          </div>
          <ol className="order-2 flex flex-col justify-center space-y-1.5 lg:order-1">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = active === i;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(i);
                      setClicking(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[var(--radius-panel)] border px-3.5 py-3 text-left transition-all",
                      isActive
                        ? "border-ink/15 bg-card shadow-[var(--shadow-card)]"
                        : "border-transparent bg-transparent hover:bg-card/70",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                        isActive
                          ? "bg-inverse text-on-inverse"
                          : "bg-muted-bg text-muted",
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink">
                          {step.label}
                        </p>
                        <span className="text-[11px] tabular-nums text-faint">
                          0{step.id}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{step.detail}</p>
                      {isActive && !paused ? (
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted-bg">
                          <motion.div
                            key={`progress-${active}`}
                            className="h-full rounded-full bg-inverse"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{
                              duration: STEP_MS / 1000,
                              ease: "linear",
                            }}
                          />
                        </div>
                      ) : isActive ? (
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted-bg">
                          <div className="h-full w-1/2 rounded-full bg-inverse/40" />
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
          Hover the demo to pause · click a step to jump
        </p>
      </Container>
    </Section>
  );
}
