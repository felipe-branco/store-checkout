import { describe, it } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import { decide } from "./PayOrderCommand";
import { evolve, initialState } from "../CreateOrder/CreateOrderCommand";
import type { OrderCreated, OrderPaid } from "@store-checkout/core";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("PayOrder", () => {
  const cartId = randomUUID();
  const orderId = randomUUID();
  const now = new Date();

  const orderCreated: OrderCreated = {
    type: "OrderCreated",
    data: {
      cart_id: cartId,
      order_id: orderId,
      items: [],
      total_in_cents: 100,
      ordered_at: now.getTime(),
    },
    metadata: { now, causation_id: cartId, streamName: cartId },
  };

  it("emits OrderPaid after OrderCreated", () => {
    given([orderCreated] as unknown as OrderPaid[])
      .when({
        type: "PayOrder",
        data: {
          cart_id: cartId,
          order_id: orderId,
          value_paid_in_cents: 100,
          currency: "USD",
          payment_method: "CREDIT_CARD",
          status: "success",
        },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .then([
        {
          type: "OrderPaid",
          data: {
            cart_id: cartId,
            order_id: orderId,
            paid_at: now.getTime(),
            value_paid_in_cents: 100,
            currency: "USD",
            payment_method: "CREDIT_CARD",
            status: "success",
          },
          metadata: { now, causation_id: cartId, streamName: cartId },
        },
      ]);
  });
});
