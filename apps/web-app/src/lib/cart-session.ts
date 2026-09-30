export const CART_ID_COOKIE = "cart_id";

const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function readCartIdFromCookieHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith(`${CART_ID_COOKIE}=`)) {
      const value = part.slice(CART_ID_COOKIE.length + 1);
      return value ? decodeURIComponent(value) : undefined;
    }
  }
  return undefined;
}

export function cartIdSetCookieValue(cartId: string): string {
  return `${CART_ID_COOKIE}=${encodeURIComponent(cartId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${CART_COOKIE_MAX_AGE_SECONDS}`;
}

export function cartIdClearCookieValue(): string {
  return `${CART_ID_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
