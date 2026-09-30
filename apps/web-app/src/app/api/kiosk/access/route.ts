import { withLoggedApiRoute } from "@/lib/api-log";
import {
  createKioskSessionToken,
  getKioskSessionSecret,
  isKioskGateEnabled,
  kioskSessionSetCookieValue,
  verifyKioskMagicWord,
} from "@/lib/kiosk-session";

export const dynamic = "force-dynamic";

type AccessBody = { magicWord?: string };

export const POST = withLoggedApiRoute("POST", "/api/kiosk/access", async (request) => {
  if (!isKioskGateEnabled()) {
    return Response.json({ success: true, gateEnabled: false });
  }

  let body: AccessBody;
  try {
    body = (await request.json()) as AccessBody;
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const magicWord = body.magicWord ?? "";
  if (!verifyKioskMagicWord(magicWord)) {
    return Response.json({ success: false, error: "Invalid access code" }, { status: 403 });
  }

  const secret = getKioskSessionSecret();
  if (!secret) {
    return Response.json({ success: false, error: "Kiosk gate misconfigured" }, { status: 500 });
  }

  const token = await createKioskSessionToken(secret);
  return Response.json(
    { success: true, gateEnabled: true },
    {
      headers: {
        "Set-Cookie": kioskSessionSetCookieValue(token),
        "Cache-Control": "no-store",
      },
    }
  );
});
