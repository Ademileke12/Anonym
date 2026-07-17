"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker only in production.
 * In dev, actively unregisters any leftover SW — a SW that intercepts
 * `/_next/*` + HMR will full-reload the page in a tight loop.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Always scrub service workers during local development
    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch (err) {
          console.warn("SW cleanup failed", err);
        }
      })();
      return;
    }

    const allow = process.env.NEXT_PUBLIC_PWA !== "false";
    if (!allow) return;

    void navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("SW register failed", err));
  }, []);

  return null;
}
