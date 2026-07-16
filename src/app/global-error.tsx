"use client";

/**
 * Required root error boundary for the App Router.
 * Must define its own <html> and <body> (replaces root layout on fatal errors).
 * Having this file also avoids Next.js 16 "global-error.js not in Client Manifest" bugs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#0c0c0e",
          color: "#f5f5f5",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.6,
              marginBottom: 12,
            }}
          >
            Anonym
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.5, margin: 0 }}>
            {error?.message || "An unexpected error occurred."}
          </p>
          {error?.digest ? (
            <p style={{ fontSize: 11, opacity: 0.4, marginTop: 8 }}>
              Digest: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 24,
              border: "none",
              borderRadius: 999,
              padding: "10px 20px",
              background: "#f5f5f5",
              color: "#0a0a0a",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
