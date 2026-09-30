import { describe, it } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import { decide, evolve, initialState } from "./CreateOrderCommand";
import type { CartCreated, ItemAddedToCart, OrderCreated } from "@store-checkout/core";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("CreateOrder", () => {
  const cartId = randomUUID();
  const orderId = randomUUID();
  const stockId = randomUUID();
  const itemId = randomUUID();
  const now = new Date();
  const line = {
    stock_id: stockId,
    item_id: itemId,
    price_in_cents: 500,
    quantity: 1,
  };

  const cartCreated: CartCreated = {
    type: "CartCreated",
    data: { cart_id: cartId, items: [], created_at: now.getTime() },
    metadata: { now, causation_id: cartId, streamName: cartId },
  };

  const itemAdded: ItemAddedToCart = {
    type: "ItemAddedToCart",
    data: {
      cart_id: cartId,
      stock_id: stockId,
      item_id: itemId,
      price_in_cents: 500,
      quantity: 1,
      added_at: now.getTime(),
    },
    metadata: { now, causation_id: cartId, streamName: cartId },
  };

  it("emits OrderCreated when cart exists", () => {
    given([cartCreated, itemAdded] as unknown as OrderCreated[])
      .when({
        type: "CreateOrder",
        data: {
          cart_id: cartId,
          order_id: orderId,
          items: [line],
          total_in_cents: 500,
        },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .then([
        {
          type: "OrderCreated",
          data: {
            cart_id: cartId,
            order_id: orderId,
            items: [line],
            total_in_cents: 500,
            ordered_at: now.getTime(),
          },
          metadata: { now, causation_id: cartId, streamName: cartId },
        },
      ]);
  });

  it("is idempotent for the same order_id", () => {
    const created: OrderCreated = {
      type: "OrderCreated",
      data: {
        cart_id: cartId,
        order_id: orderId,
        items: [line],
        total_in_cents: 500,
        ordered_at: now.getTime(),
      },
      metadata: { now, causation_id: cartId, streamName: cartId },
    };

    given([cartCreated, itemAdded, created] as unknown as OrderCreated[])
      .when({
        type: "CreateOrder",
        data: {
          cart_id: cartId,
          order_id: orderId,
          items: [line],
          total_in_cents: 500,
        },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .then([]);
  });
});
