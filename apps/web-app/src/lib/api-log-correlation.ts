export function resolveCorrelationId(request: Request): string {
  const fromHeader =
    request.headers.get("x-correlation-id")?.trim() ||
    request.headers.get("x-request-id")?.trim();
  return fromHeader && fromHeader.length > 0 ? fromHeader : crypto.randomUUID();
}
