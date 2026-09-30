import { describe, it, expect } from "vitest";
import type { ReadEvent, PostgresReadEventMetadata } from "@store-checkout/event-store";
import type { OrderCreated, OrderPaymentFailed, OrderPaid } from "@store-checkout/core";
import { evolve } from "./PaymentFailedOrderProjection";

function orderEvent<E extends OrderCreated | OrderPaymentFailed | OrderPaid>(
  event: E,
  streamName: string
): ReadEvent<E, PostgresReadEventMetadata> {
  return {
    kind: "Event",
    ...event,
    metadata: { streamName, ...event.metadata },
  } as ReadEvent<E, PostgresReadEventMetadata>;
}

describe("PaymentFailedOrderProjection", () => {
  const cartId = "11111111-1111-4111-8111-111111111111";
  const orderId = "22222222-2222-4222-8222-222222222222";
  const now = new Date();

  it("builds failed order read model after OrderPaymentFailed", () => {
    const created = orderEvent<OrderCreated>(
      {
        type: "OrderCreated",
        data: {
          cart_id: cartId,
          order_id: orderId,
          items: [
            {
              stock_id: "33333333-3333-4333-8333-333333333333",
              item_id: "44444444-4444-4444-8444-444444444444",
              price_in_cents: 500,
              quantity: 2,
            },
          ],
          total_in_cents: 1000,
          ordered_at: now.getTime(),
        },
        metadata: { now, causation_id: cartId, streamName: cartId },
      },
      cartId
    );

    let doc = evolve(null, created);
    const failed = orderEvent<OrderPaymentFailed>(
      {
        type: "OrderPaymentFailed",
        data: {
          cart_id: cartId,
          order_id: orderId,
          failed_at: now.getTime(),
          currency: "USD",
          payment_method: "CREDIT_CARD",
          status: "fail",
        },
        metadata: { now, causation_id: orderId, streamName: cartId },
      },
      cartId
    );

    doc = evolve(doc, failed);
    expect(doc).toEqual({
      cart_id: cartId,
      order_id: orderId,
      items: created.data.items,
      total_in_cents: 1000,
    });
  });

  it("clears read model on OrderPaid", () => {
    const paid = orderEvent<OrderPaid>(
      {
        type: "OrderPaid",
        data: {
          cart_id: cartId,
          order_id: orderId,
          paid_at: now.getTime(),
          value_paid_in_cents: 1000,
          currency: "USD",
          payment_method: "CREDIT_CARD",
          status: "success",
        },
        metadata: { now, causation_id: orderId, streamName: cartId },
      },
      cartId
    );

    expect(evolve({ cart_id: cartId, order_id: orderId, items: [], total_in_cents: 0 }, paid)).toBeNull();
  });
});
