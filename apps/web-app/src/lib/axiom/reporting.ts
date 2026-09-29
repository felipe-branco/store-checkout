/**
 * When to send structured logs to Axiom — aligned with {@link isSentryReportingEnabled}:
 * production build on Vercel Production (`VERCEL_ENV=production`), not Preview or local dev.
 *
 * For self-hosted production without `VERCEL_ENV`, set `AXIOM_FORCE_SELF_HOSTED=1` when both
 * `AXIOM_TOKEN` and `AXIOM_DATASET` are configured.
 */
export function isAxiomReportingEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }
  if (!process.env.AXIOM_TOKEN?.trim() || !process.env.AXIOM_DATASET?.trim()) {
    return false;
  }
  if (process.env.AXIOM_FORCE_SELF_HOSTED === "1") {
    return true;
  }
  const tier = process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? "";
  return tier === "production";
}
