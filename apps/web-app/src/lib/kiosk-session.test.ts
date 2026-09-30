import { describe, it, expect, afterEach, vi } from "vitest";
import {
  createKioskSessionToken,
  verifyKioskMagicWord,
  verifyKioskSessionToken,
  isKioskGateEnabled,
} from "./kiosk-session";

describe("kiosk-session", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllEnvs();
  });

  it("isKioskGateEnabled is false outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("KIOSK_ACCESS_MAGIC_WORD", "secret");
    expect(isKioskGateEnabled()).toBe(false);
  });

  it("verifyKioskMagicWord uses constant-time compare", () => {
    vi.stubEnv("KIOSK_ACCESS_MAGIC_WORD", "alpha");
    expect(verifyKioskMagicWord("alpha")).toBe(true);
    expect(verifyKioskMagicWord("beta")).toBe(false);
  });

  it("creates and verifies session token", async () => {
    const secret = "signing-secret";
    const token = await createKioskSessionToken(secret);
    expect(await verifyKioskSessionToken(token, secret)).toBe(true);
    expect(await verifyKioskSessionToken(token, "wrong")).toBe(false);
  });
});
