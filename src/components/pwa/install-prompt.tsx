"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Mobile install prompt for Anonym PWA (Phase Next · Mobile clients).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("anonym-pwa-dismiss") === "1") {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-40 mx-auto max-w-md rounded-[var(--radius-card)] border border-line bg-card p-3 shadow-[var(--shadow-elevated)] md:bottom-6 md:left-auto md:right-6">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-subtle text-muted">
          <Download className="size-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install Anonym</p>
          <p className="mt-0.5 text-xs text-muted">
            Add to your home screen for a mobile app experience.
          </p>
          <div className="mt-2.5 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                void (async () => {
                  await deferred.prompt();
                  await deferred.userChoice;
                  setDeferred(null);
                })();
              }}
            >
              Install
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDismissed(true);
                try {
                  sessionStorage.setItem("anonym-pwa-dismiss", "1");
                } catch {
                  /* ignore */
                }
              }}
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-faint hover:bg-subtle hover:text-ink"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
