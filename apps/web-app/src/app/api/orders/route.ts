import { initializeEventStore, getPongoDb } from "@/lib/eventStore";
import { initializeMessageBus, getCommandDispatcher } from "@/lib/messageBus";
import { readCartIdFromCookieHeader } from "@/lib/cart-session";
import { withLoggedApiRoute } from "@/lib/api-log";
import {
  catalogRowsToKioskCart,
  handleCartDetailsRoute,
  handleCreateOrderRoute,
  mapPaymentMethodToEm,
  orderDisplayNumber,
  registerPendingPaymentSimulation,
  type OrderLineItem,
} from "@store-checkout/slices/server";
import { getCatalogRowByProductId, getStockProductsListCatalogRows } from "@/lib/kiosk/stock-products-list";
import { validateOrderPayload } from "@/lib/kiosk/catalog";
import type { CreateOrderResponse } from "@store-checkout/ui";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function ensureBackendReady(): Promise<void> {
  await initializeEventStore();
  await initializeMessageBus();
}

function buildOrderLines(
  items: { productId: string; quantity: number }[]
): { lines: OrderLineItem[]; totalInCents: number } | { error: string } {
  const lines: OrderLineItem[] = [];
  let totalInCents = 0;

  for (const { productId, quantity } of items) {
    const row = getCatalogRowByProductId(productId);
    if (!row) {
      return { error: "Item not found." };
    }
    lines.push({
      stock_id: row.stockId,
      item_id: row.itemId,
      price_in_cents: row.priceInCents,
      quantity,
    });
    totalInCents += row.priceInCents * quantity;
  }

  return { lines, totalInCents };
}

export const POST = withLoggedApiRoute(
  "POST",
  "/api/orders",
  async (request) => {
    await ensureBackendReady();

    const cartId = readCartIdFromCookieHeader(request.headers.get("cookie"));
    if (!cartId) {
      return Response.json(
        { ok: false, error: "invalid", message: "No active cart session." } satisfies CreateOrderResponse,
        { status: 404 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: "invalid", message: "Invalid order." } satisfies CreateOrderResponse,
        { status: 400 }
      );
    }

    const parsed = validateOrderPayload(body);
    if (!parsed.ok) {
      return Response.json(
        { ok: false, error: "invalid", message: parsed.message } satisfies CreateOrderResponse,
        { status: 400 }
      );
    }

    const built = buildOrderLines(parsed.items);
    if ("error" in built) {
      return Response.json(
        { ok: false, error: "invalid", message: built.error } satisfies CreateOrderResponse,
        { status: 400 }
      );
    }

    const db = getPongoDb();
    const catalog = getStockProductsListCatalogRows();
    const cartDetails = await handleCartDetailsRoute({ cartId }, db);
    if (!cartDetails.success) {
      return Response.json(
        { ok: false, error: "failed", message: "Could not load cart." } satisfies CreateOrderResponse,
        { status: 500 }
      );
    }

    const kioskCart = catalogRowsToKioskCart(cartDetails.data, catalog);
    for (const { productId, quantity } of parsed.items) {
      const inCart = kioskCart[productId] ?? 0;
      if (inCart < quantity) {
        return Response.json(
          { ok: false, error: "invalid", message: "Cart no longer matches this order." } satisfies CreateOrderResponse,
          { status: 409 }
        );
      }
    }

    const orderId = z.uuid().safeParse(parsed.idempotencyKey).success
      ? parsed.idempotencyKey
      : crypto.randomUUID();

    if (parsed.simulationStatus) {
      registerPendingPaymentSimulation(orderId, {
        status: parsed.simulationStatus,
        paymentMethod: mapPaymentMethodToEm(parsed.paymentMethod),
        valuePaid: built.totalInCents,
        currency: "USD",
        webhookItems: built.lines,
      });
    }

    const correlationId = crypto.randomUUID();
    const dispatcher = getCommandDispatcher();
    const createResult = await handleCreateOrderRoute(
      {
        cart_id: cartId,
        order_id: orderId,
        items: built.lines,
        total_in_cents: built.totalInCents,
      },
      dispatcher,
      correlationId
    );

    if (!createResult.success) {
      return Response.json(
        { ok: false, error: "failed", message: createResult.error } satisfies CreateOrderResponse,
        { status: 400 }
      );
    }

    const itemCount = parsed.items.reduce((sum, i) => sum + i.quantity, 0);

    return Response.json(
      {
        ok: true,
        order: {
          orderNumber: orderDisplayNumber(orderId),
          total: built.totalInCents,
          itemCount,
        },
        orderId,
        cartId,
        paymentMethod: mapPaymentMethodToEm(parsed.paymentMethod),
        webhookItems: built.lines,
        currency: "USD",
      },
      { status: createResult.orderCreated ? 201 : 200 }
    );
  },
  {
    enrich: () => ({ commandType: "CreateOrder" }),
  }
);
