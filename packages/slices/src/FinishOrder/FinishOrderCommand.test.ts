import { describe, it } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import { decide } from "./FinishOrderCommand";
import { evolve, initialState } from "../CreateOrder/CreateOrderCommand";
import type { OrderCreated, OrderPaid, OrderFinished } from "@store-checkout/core";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("FinishOrder", () => {
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

  const orderPaid: OrderPaid = {
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
  };

  it("emits OrderFinished after OrderPaid", () => {
    given([orderCreated, orderPaid] as unknown as OrderFinished[])
      .when({
        type: "FinishOrder",
        data: {
          cart_id: cartId,
          order_id: orderId,
        },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .then([
        {
          type: "OrderFinished",
          data: {
            cart_id: cartId,
            order_id: orderId,
            finished_at: now.getTime(),
          },
          metadata: { now, causation_id: cartId, streamName: cartId },
        },
      ]);
  });
});
