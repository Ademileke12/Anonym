"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "anonym-private-balances";

/**
 * Private balances preference (Phase Next).
 * When enabled, wallet & raised figures are blurred until the user reveals.
 */
export function usePrivateBalances() {
  const [enabled, setEnabledState] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setEnabledState(raw === "1" || raw === "true");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    setRevealed(false);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const reveal = useCallback(() => setRevealed(true), []);
  const hide = useCallback(() => setRevealed(false), []);

  const mask = enabled && !revealed;

  return {
    enabled,
    setEnabled,
    revealed,
    reveal,
    hide,
    mask,
    ready,
  };
}

/** Display helper: mask numeric/currency strings when private mode is on. */
export function formatPrivateValue(
  value: string,
  mask: boolean,
  placeholder = "••••",
): string {
  if (!mask) return value;
  if (value === "…" || value === "-" || value === "") return value;
  return placeholder;
}
