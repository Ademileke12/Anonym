"use client";

import { useEffect } from "react";

/** Registers the PWA service worker (mobile install / offline shell). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Only in production or when explicitly enabled
    const allow =
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_PWA === "true";
    if (!allow) return;

    void navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("SW register failed", err));
  }, []);

  return null;
}
