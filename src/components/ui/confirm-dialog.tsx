"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = red confirm for destructive actions */
  tone?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Attio-style modal confirm (replaces window.confirm).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, loading, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
        aria-label="Close dialog"
        disabled={loading}
        onClick={() => {
          if (!loading) onCancel();
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-float)] sm:p-6"
      >
        <button
          type="button"
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-subtle hover:text-ink disabled:opacity-50"
          onClick={onCancel}
          disabled={loading}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="flex gap-3 pr-8">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border border-line",
              tone === "danger"
                ? "bg-chip-red-bg text-chip-red-fg"
                : "bg-subtle text-muted",
            )}
          >
            <AlertTriangle className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-ink"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descId}
                className="mt-1.5 text-sm leading-relaxed text-muted"
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            className="w-full sm:w-auto"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
