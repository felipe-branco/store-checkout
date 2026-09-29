/**
 * pg (via pg-connection-string) emits a deprecation warning when `sslmode` is
 * `require`, `prefer`, or `verify-ca` without opting in: today those map to
 * `verify-full`; pg v9 will follow libpq semantics instead.
 *
 * Normalizing to `verify-full` preserves current strict TLS behavior and silences
 * the warning for typical hosted URLs (e.g. Neon’s `?sslmode=require`).
 *
 * URLs that already include `uselibpqcompat=true` are left unchanged (libpq
 * semantics opt-in per pg’s warning).
 *
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizePostgresUrlForPgSsl(connectionString: string): string {
  const trimmed = connectionString.trim();
  if (!trimmed) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.searchParams.get("uselibpqcompat") === "true") {
      return trimmed;
    }
    const mode = url.searchParams.get("sslmode");
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    // Non-URI connection strings — leave unchanged
  }
  return trimmed;
}
