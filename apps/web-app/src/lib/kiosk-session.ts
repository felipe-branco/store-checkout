export const KIOSK_SESSION_COOKIE = "kiosk_session";

const SESSION_VERSION = "v1";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export function isKioskGateEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    Boolean(process.env.KIOSK_ACCESS_MAGIC_WORD?.trim())
  );
}

export function getKioskSessionSecret(): string | undefined {
  const sessionSecret = process.env.KIOSK_SESSION_SECRET?.trim();
  if (sessionSecret) {
    return sessionSecret;
  }
  const magicWord = process.env.KIOSK_ACCESS_MAGIC_WORD?.trim();
  if (magicWord && isKioskGateEnabled()) {
    return magicWord;
  }
  return undefined;
}

export function verifyKioskMagicWord(candidate: string): boolean {
  const expected = process.env.KIOSK_ACCESS_MAGIC_WORD?.trim();
  if (!expected) {
    return false;
  }
  return magicWordsMatch(expected, candidate.trim());
}

function magicWordsMatch(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

function bufferToBase64Url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bufferToBase64Url(sig);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createKioskSessionToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${SESSION_VERSION}.${exp}`;
  const sig = await hmacSign(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyKioskSessionToken(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token) {
    return false;
  }
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== SESSION_VERSION) {
    return false;
  }
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${parts[0]}.${parts[1]}`;
  const expectedSig = await hmacSign(secret, payload);
  return constantTimeEqual(parts[2]!, expectedSig);
}

export function readKioskSessionFromCookieHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  const prefix = `${KIOSK_SESSION_COOKIE}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const value = trimmed.slice(prefix.length);
      return value ? decodeURIComponent(value) : undefined;
    }
  }
  return undefined;
}

export function kioskSessionSetCookieValue(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${KIOSK_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function isKioskApiPathExempt(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    pathname.startsWith("/api/health/") ||
    pathname === "/api/kiosk/access" ||
    pathname === "/api/kiosk/session" ||
    pathname === "/api/webhooks/payment"
  );
}

export async function verifyKioskSessionRequest(request: Request): Promise<boolean> {
  if (!isKioskGateEnabled()) {
    return true;
  }
  const secret = getKioskSessionSecret();
  if (!secret) {
    return false;
  }
  const token = readKioskSessionFromCookieHeader(request.headers.get("cookie"));
  return verifyKioskSessionToken(token, secret);
}
