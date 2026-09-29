/**
 * Shared toggles for Sentry client/server/edge configs.
 */

/** True only on Vercel Production (`VERCEL_ENV=production`), not Preview or local. */
export function isSentryReportingEnabled(): boolean {
  if (
    !process.env.NEXT_PUBLIC_SENTRY_DSN ||
    process.env.NODE_ENV !== "production"
  ) {
    return false;
  }
  const tier =
    process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? "";
  return tier === "production";
}

export function getSentryEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV
  );
}

/** Server + edge performance traces (sampled). */
export const tracesSampleRate = 0.1;

/** Browser performance traces (sampled). */
export const browserTracesSampleRate = 0.1;
