import { z } from "zod";

export type ParseJsonResult<T> =
  | { success: true; data: T }
  | { success: false; error: "INVALID_JSON" | "VALIDATION_ERROR" };

/**
 * Parse JSON request body and validate with Zod.
 */
export async function parseJsonRequest<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<ParseJsonResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { success: false, error: "INVALID_JSON" };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "VALIDATION_ERROR" };
  }
  return { success: true, data: parsed.data };
}

export type SafeParseJsonBodyResult<T> =
  | { success: true; data: T }
  | { success: false; kind: "invalid_json" }
  | { success: false; kind: "validation"; raw: unknown; zodError: z.ZodError };

/** Like {@link parseJsonRequest} but preserves `raw` + `ZodError` for safe user-facing messages. */
export async function safeParseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<SafeParseJsonBodyResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { success: false, kind: "invalid_json" };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, kind: "validation", raw, zodError: parsed.error };
  }
  return { success: true, data: parsed.data };
}

export type ParseSearchParamsResult<T> =
  | { success: true; data: T }
  | { success: false; error: "VALIDATION_ERROR" };

function searchParamsToRecord(searchParams: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  const seen = new Set<string>();
  for (const [key, value] of searchParams) {
    if (seen.has(key)) continue;
    seen.add(key);
    const t = value.trim();
    if (t !== "") {
      record[key] = t;
    }
  }
  return record;
}

/**
 * Build a record from URL search params and validate with Zod.
 * Omits empty/whitespace-only values so optional query keys behave like `get()?.trim()`.
 */
export function parseSearchParamsFromUrl<T>(
  url: URL | string,
  schema: z.ZodType<T>
): ParseSearchParamsResult<T> {
  const u = typeof url === "string" ? new URL(url) : url;
  const parsed = schema.safeParse(searchParamsToRecord(u.searchParams));
  if (!parsed.success) {
    return { success: false, error: "VALIDATION_ERROR" };
  }
  return { success: true, data: parsed.data };
}
