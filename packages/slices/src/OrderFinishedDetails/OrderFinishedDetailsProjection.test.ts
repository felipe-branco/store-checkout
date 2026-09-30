import { describe, it, expect } from "vitest";
import type { ReadEvent, PostgresReadEventMetadata } from "@store-checkout/event-store";
import type { OrderCreated, OrderPaid, OrderFinished, OrderPaymentFailed } from "@store-checkout/core";
import { evolve } from "./OrderFinishedDetailsProjection";

function orderEvent<
  E extends OrderCreated | OrderPaid | OrderFinished | OrderPaymentFailed,
>(event: E, streamName: string): ReadEvent<E, PostgresReadEventMetadata> {
  return {
    kind: "Event",
    ...event,
    metadata: { streamName, ...event.metadata },
  } as ReadEvent<E, PostgresReadEventMetadata>;
}

describe("OrderFinishedDetailsProjection", () => {
  const cartId = "11111111-1111-4111-8111-111111111111";
  const orderId = "22222222-2222-4222-8222-222222222222";
  const now = new Date();

  it("tracks paid order details for checkout confirmation", () => {
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
              quantity: 1,
            },
          ],
          total_in_cents: 500,
          ordered_at: now.getTime(),
        },
        metadata: { now, causation_id: cartId, streamName: cartId },
      },
      cartId
    );

    let doc = evolve(null, created);
    const paid = orderEvent<OrderPaid>(
      {
        type: "OrderPaid",
        data: {
          cart_id: cartId,
          order_id: orderId,
          paid_at: now.getTime(),
          value_paid_in_cents: 500,
          currency: "USD",
          payment_method: "CREDIT_CARD",
          status: "success",
        },
        metadata: { now, causation_id: orderId, streamName: cartId },
      },
      cartId
    );

    doc = evolve(doc, paid);
    expect(doc?.paid_at).toBe(now.getTime());
    expect(doc?.value_paid_in_cents).toBe(500);

    const finished = orderEvent<OrderFinished>(
      {
        type: "OrderFinished",
        data: {
          cart_id: cartId,
          order_id: orderId,
          finished_at: now.getTime() + 1,
        },
        metadata: { now, causation_id: orderId, streamName: cartId },
      },
      cartId
    );

    doc = evolve(doc, finished);
    expect(doc?.finished_at).toBe(now.getTime() + 1);
  });

  it("clears on OrderPaymentFailed", () => {
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

    expect(
      evolve(
        {
          cart_id: cartId,
          order_id: orderId,
          finished_at: null,
          paid_at: now.getTime(),
          items: [],
          total_in_cents: 500,
          value_paid_in_cents: 500,
        },
        failed
      )
    ).toBeNull();
  });
});
