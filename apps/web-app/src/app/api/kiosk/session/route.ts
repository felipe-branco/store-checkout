import { withLoggedApiRoute } from "@/lib/api-log";
import {
  getKioskSessionSecret,
  isKioskGateEnabled,
  readKioskSessionFromCookieHeader,
  verifyKioskSessionToken,
} from "@/lib/kiosk-session";

export const dynamic = "force-dynamic";

export const GET = withLoggedApiRoute("GET", "/api/kiosk/session", async (request) => {
  const gateEnabled = isKioskGateEnabled();
  if (!gateEnabled) {
    return Response.json({ success: true, gateEnabled: false, authorized: true });
  }

  const secret = getKioskSessionSecret();
  if (!secret) {
    return Response.json(
      { success: false, gateEnabled: true, authorized: false, error: "Kiosk gate misconfigured" },
      { status: 500 }
    );
  }

  const token = readKioskSessionFromCookieHeader(request.headers.get("cookie"));
  const authorized = await verifyKioskSessionToken(token, secret);

  return Response.json(
    { success: true, gateEnabled: true, authorized },
    { headers: { "Cache-Control": "no-store" } }
  );
});
