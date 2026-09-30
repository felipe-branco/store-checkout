import { initializeEventStore, getPongoDb } from "@/lib/eventStore";
import { initializeMessageBus, getCommandDispatcher } from "@/lib/messageBus";
import {
  readCartIdFromCookieHeader,
  cartIdSetCookieValue,
  cartIdClearCookieValue,
} from "@/lib/cart-session";
import { withLoggedApiRoute } from "@/lib/api-log";
import {
  catalogRowsToKioskCart,
  handleCartDetailsRoute,
  handleClearCartRoute,
  handleCreateCartRoute,
} from "@store-checkout/slices/server";
import { getStockProductsListCatalogRows } from "@/lib/kiosk/stock-products-list";

export const dynamic = "force-dynamic";

async function ensureBackendReady(): Promise<void> {
  await initializeEventStore();
  await initializeMessageBus();
}

export const POST = withLoggedApiRoute(
  "POST",
  "/api/cart",
  async () => {
    await ensureBackendReady();
    const correlationId = crypto.randomUUID();
    const dispatcher = getCommandDispatcher();
    const result = await handleCreateCartRoute({}, dispatcher, correlationId);

    if (!result.success) {
      return Response.json(result, { status: 400 });
    }

    return Response.json(
      { success: true, cart_id: result.cart_id },
      {
        status: 201,
        headers: {
          "Set-Cookie": cartIdSetCookieValue(result.cart_id),
          "Cache-Control": "no-store",
        },
      }
    );
  },
  {
    enrich: async ({ response }) => {
      try {
        const body = (await response.clone().json()) as {
          success?: boolean;
          cart_id?: string;
        };
        if (body.success && body.cart_id) {
          return {
            commandType: "CreateCart",
            aggregateId: body.cart_id,
          };
        }
      } catch {
        /* ignore */
      }
      return { commandType: "CreateCart" };
    },
  }
);

export const GET = withLoggedApiRoute("GET", "/api/cart", async (request) => {
  await ensureBackendReady();
  const cartId = readCartIdFromCookieHeader(request.headers.get("cookie"));
  if (!cartId) {
    return Response.json(
      { success: false, error: "No active cart session" },
      { status: 404 }
    );
  }

  const db = getPongoDb();
  const catalog = getStockProductsListCatalogRows();
  const result = await handleCartDetailsRoute({ cartId }, db);
  if (!result.success) {
    return Response.json(result, { status: 500 });
  }

  const kioskCart = catalogRowsToKioskCart(result.data, catalog);
  return Response.json(
    {
      success: true,
      data: result.data,
      kioskCart,
      cart_id: cartId,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
});

export const DELETE = withLoggedApiRoute(
  "DELETE",
  "/api/cart",
  async (request) => {
    await ensureBackendReady();
    const cartId = readCartIdFromCookieHeader(request.headers.get("cookie"));
    if (cartId) {
      const correlationId = crypto.randomUUID();
      const dispatcher = getCommandDispatcher();
      await handleClearCartRoute({ cart_id: cartId }, dispatcher, correlationId);
    }

    return Response.json(
      { success: true },
      {
        headers: {
          "Set-Cookie": cartIdClearCookieValue(),
          "Cache-Control": "no-store",
        },
      }
    );
  },
  {
    enrich: () => ({ commandType: "ClearCart" }),
  }
);
