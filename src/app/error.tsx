"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        Error
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        {error.message || "An unexpected error occurred while rendering this page."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-fg"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-full border border-line-strong bg-card px-5 text-sm font-medium text-ink"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
