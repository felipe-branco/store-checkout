import { initializeEventStore } from "@/lib/eventStore";
import { initializeMessageBus, getCommandDispatcher } from "@/lib/messageBus";
import { readCartIdFromCookieHeader } from "@/lib/cart-session";
import { withLoggedApiRoute } from "@/lib/api-log";
import {
  handleAddItemToCartRoute,
  handleRemoveItemFromCartRoute,
} from "@store-checkout/slices/server";
import { getCatalogRowByProductId } from "@/lib/kiosk/stock-products-list";
import type { ApiLogEnricher } from "@/lib/api-log";
import { z } from "zod";

export const dynamic = "force-dynamic";

const itemBodySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().optional().default(1),
});

async function ensureBackendReady(): Promise<void> {
  await initializeEventStore();
  await initializeMessageBus();
}

const cartItemRouteLogEnrich =
  (primaryCommandType: string): ApiLogEnricher =>
  async ({ response }) => {
    try {
      const body = (await response.clone().json()) as {
        success?: boolean;
        error?: string;
        code?: string;
        failedCommandType?: string;
      };
      if (body.success === false) {
        return {
          commandType: body.failedCommandType ?? primaryCommandType,
          error: body.error,
          errorCode: body.code,
          success: false,
        };
      }
    } catch {
      // non-JSON body
    }
    return { commandType: primaryCommandType };
  };

export const POST = withLoggedApiRoute(
  "POST",
  "/api/cart/items",
  async (request) => {
    await ensureBackendReady();
    const cartId = readCartIdFromCookieHeader(request.headers.get("cookie"));
    if (!cartId) {
      return Response.json({ success: false, error: "No active cart session" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = itemBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    const catalogRow = getCatalogRowByProductId(parsed.data.productId);
    if (!catalogRow) {
      return Response.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    const correlationId = crypto.randomUUID();
    const dispatcher = getCommandDispatcher();
    const result = await handleAddItemToCartRoute(
      {
        cart_id: cartId,
        stock_id: catalogRow.stockId,
        item_id: catalogRow.itemId,
        price_in_cents: catalogRow.priceInCents,
        quantity: parsed.data.quantity,
        on_hand_quantity: catalogRow.quantity,
      },
      dispatcher,
      correlationId
    );

    if (!result.success) {
      const status =
        result.code === "STOCK_RESERVE_FAILED" ? 409 : 400;
      return Response.json(result, { status });
    }

    return Response.json({ success: true }, { status: 200 });
  },
  {
    enrich: cartItemRouteLogEnrich("AddItemToCart"),
  }
);

export const DELETE = withLoggedApiRoute(
  "DELETE",
  "/api/cart/items",
  async (request) => {
    await ensureBackendReady();
    const cartId = readCartIdFromCookieHeader(request.headers.get("cookie"));
    if (!cartId) {
      return Response.json({ success: false, error: "No active cart session" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = itemBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    const catalogRow = getCatalogRowByProductId(parsed.data.productId);
    if (!catalogRow) {
      return Response.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    const correlationId = crypto.randomUUID();
    const dispatcher = getCommandDispatcher();
    const result = await handleRemoveItemFromCartRoute(
      {
        cart_id: cartId,
        stock_id: catalogRow.stockId,
        item_id: catalogRow.itemId,
        price_in_cents: catalogRow.priceInCents,
        quantity: parsed.data.quantity,
        on_hand_quantity: catalogRow.quantity,
      },
      dispatcher,
      correlationId
    );

    if (!result.success) {
      const status =
        result.code === "STOCK_DERESERVE_FAILED" ? 409 : 400;
      return Response.json(result, { status });
    }

    return Response.json({ success: true }, { status: 200 });
  },
  {
    enrich: cartItemRouteLogEnrich("RemoveItemFromCart"),
  }
);
