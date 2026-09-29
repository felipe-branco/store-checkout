import { describe, expect, it } from "vitest";
import { normalizePostgresUrlForPgSsl } from "./normalizePostgresUrlForPgSsl";

describe("normalizePostgresUrlForPgSsl", () => {
  it("maps sslmode=require to verify-full", () => {
    expect(
      normalizePostgresUrlForPgSsl(
        "postgresql://u:p@host.example/db?sslmode=require&channel_binding=require"
      )
    ).toBe("postgresql://u:p@host.example/db?sslmode=verify-full&channel_binding=require");
  });

  it("maps sslmode=prefer and verify-ca to verify-full", () => {
    expect(normalizePostgresUrlForPgSsl("postgresql://h/db?sslmode=prefer")).toBe(
      "postgresql://h/db?sslmode=verify-full"
    );
    expect(normalizePostgresUrlForPgSsl("postgresql://h/db?sslmode=verify-ca")).toBe(
      "postgresql://h/db?sslmode=verify-full"
    );
  });

  it("leaves sslmode=require when uselibpqcompat=true (explicit libpq opt-in)", () => {
    const u = "postgresql://h/db?uselibpqcompat=true&sslmode=require";
    expect(normalizePostgresUrlForPgSsl(u)).toBe(u);
  });

  it("leaves verify-full, disable, and missing sslmode unchanged", () => {
    expect(normalizePostgresUrlForPgSsl("postgresql://h/db?sslmode=verify-full")).toBe(
      "postgresql://h/db?sslmode=verify-full"
    );
    expect(normalizePostgresUrlForPgSsl("postgresql://h/db?sslmode=disable")).toBe(
      "postgresql://h/db?sslmode=disable"
    );
    expect(normalizePostgresUrlForPgSsl("postgresql://localhost:5432/em_slices")).toBe(
      "postgresql://localhost:5432/em_slices"
    );
  });

  it("returns non-URL strings unchanged", () => {
    expect(normalizePostgresUrlForPgSsl("not a url")).toBe("not a url");
  });
});
