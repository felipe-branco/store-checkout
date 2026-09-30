import { initializeEventStore } from "@/lib/eventStore";
import { initializeMessageBus, getCommandDispatcher } from "@/lib/messageBus";
import { readCartIdFromCookieHeader } from "@/lib/cart-session";
import { withLoggedApiRoute } from "@/lib/api-log";
import { handleClearCartRoute } from "@store-checkout/slices/server";

export const dynamic = "force-dynamic";

async function ensureBackendReady(): Promise<void> {
  await initializeEventStore();
  await initializeMessageBus();
}

export const POST = withLoggedApiRoute(
  "POST",
  "/api/cart/clear",
  async (request) => {
    await ensureBackendReady();
    const cartId = readCartIdFromCookieHeader(request.headers.get("cookie"));
    if (!cartId) {
      return Response.json({ success: false, error: "No active cart session" }, { status: 404 });
    }

    const correlationId = crypto.randomUUID();
    const dispatcher = getCommandDispatcher();
    const result = await handleClearCartRoute({ cart_id: cartId }, dispatcher, correlationId);

    if (!result.success) {
      return Response.json(result, { status: 400 });
    }

    return Response.json({ success: true }, { status: 200 });
  },
  {
    enrich: () => ({ commandType: "ClearCart" }),
  }
);
