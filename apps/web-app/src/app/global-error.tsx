"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Root boundary for catastrophic App Router failures; must render its own `<html>` / `<body>`. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-US">
      <body
        style={{
          fontFamily:
            'var(--font-inter), system-ui, -apple-system, Segoe UI, sans-serif',
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1>Something went wrong</h1>
        <p>Please try again.</p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </body>
    </html>
  );
}
