import { describe, expect, it } from "vitest";

import { resolveCorrelationId } from "./api-log-correlation";

describe("resolveCorrelationId", () => {
  it("uses x-correlation-id when present", () => {
    const request = new Request("http://localhost/api/products", {
      headers: { "x-correlation-id": "corr-123" },
    });
    expect(resolveCorrelationId(request)).toBe("corr-123");
  });

  it("falls back to x-request-id", () => {
    const request = new Request("http://localhost/api/products", {
      headers: { "x-request-id": "req-456" },
    });
    expect(resolveCorrelationId(request)).toBe("req-456");
  });

  it("generates a UUID when headers are missing", () => {
    const request = new Request("http://localhost/api/products");
    expect(resolveCorrelationId(request)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});
