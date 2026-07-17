"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type PayQrProps = {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
};

/**
 * Client-side QR as a data: URL — works under strict CSP (no third-party img hosts).
 */
export function PayQr({
  value,
  size = 176,
  className,
  alt = "QR code",
}: PayQrProps) {
  const [src, setSrc] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setSrc("");
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);
    void QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0a0a0a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSrc("");
          setError(e instanceof Error ? e.message : "QR failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!value) {
    return (
      <div
        className={cn(
          "mx-auto flex items-center justify-center rounded-xl border border-line bg-subtle text-xs text-muted",
          className,
        )}
        style={{ width: size, height: size }}
      >
        No link yet
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "mx-auto flex items-center justify-center rounded-xl border border-line bg-subtle p-3 text-center text-xs text-muted",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {error}
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={cn(
          "mx-auto flex items-center justify-center rounded-xl border border-line bg-subtle",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <Loader2 className="size-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn(
        "mx-auto rounded-xl border border-line bg-card p-2",
        className,
      )}
    />
  );
}
