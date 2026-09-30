import { initializeEventStore, getPongoDb } from "@/lib/eventStore";
import { readCartIdFromCookieHeader } from "@/lib/cart-session";
import { withLoggedApiRoute } from "@/lib/api-log";
import { handleOrderCheckoutStatusRoute } from "@store-checkout/slices/server";

export const dynamic = "force-dynamic";

export const GET = withLoggedApiRoute(
  "GET",
  "/api/orders/status",
  async (request) => {
    await initializeEventStore();
    const url = new URL(request.url);
    const queryCartId = url.searchParams.get("cart_id");
    const orderId = url.searchParams.get("order_id");

    const cookieCartId = readCartIdFromCookieHeader(request.headers.get("cookie"));
    const cartId = queryCartId ?? cookieCartId;

    if (!cartId || !orderId) {
      return Response.json(
        { success: false, error: "cart_id and order_id are required" },
        { status: 400 }
      );
    }

    if (cookieCartId && queryCartId && cookieCartId !== queryCartId) {
      return Response.json({ success: false, error: "cart_id does not match session" }, { status: 403 });
    }

    const db = getPongoDb();
    const result = await handleOrderCheckoutStatusRoute({ cartId, orderId }, db);

    if (!result.success) {
      return Response.json(result, { status: 500 });
    }

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  }
);
