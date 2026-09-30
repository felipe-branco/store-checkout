import { describe, it } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import { decide } from "./FailOrderPaymentCommand";
import { evolve, initialState } from "../CreateOrder/CreateOrderCommand";
import type { OrderCreated, OrderPaymentFailed } from "@store-checkout/core";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("FailOrderPayment", () => {
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

  it("emits OrderPaymentFailed after OrderCreated", () => {
    given([orderCreated] as unknown as OrderPaymentFailed[])
      .when({
        type: "FailOrderPayment",
        data: {
          cart_id: cartId,
          order_id: orderId,
          currency: "USD",
          payment_method: "CREDIT_CARD",
          status: "fail",
        },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .then([
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
          metadata: { now, causation_id: cartId, streamName: cartId },
        },
      ]);
  });
});
