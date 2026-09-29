/**
 * Recursively convert values that JSON.stringify cannot handle (e.g. BigInt)
 * into JSON-serializable form. Pongo/PostgreSQL projections may return BigInt
 * for _version and similar fields.
 */
export function sanitizeForJson<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "bigint") {
    return value.toString() as T;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeForJson) as T;
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = sanitizeForJson(v);
    }
    return result as T;
  }
  return value;
}
