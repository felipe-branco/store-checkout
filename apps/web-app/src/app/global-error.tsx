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
    <html lang="pt-BR">
      <body
        style={{
          fontFamily:
            'var(--font-inter), system-ui, -apple-system, Segoe UI, sans-serif',
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1>Algo deu errado</h1>
        <p>Por favor, tente novamente.</p>
        <button type="button" onClick={() => reset()}>
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
