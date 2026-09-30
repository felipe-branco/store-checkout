import { describe, it, expect } from "vitest";
import type { ReadEvent, PostgresReadEventMetadata } from "@store-checkout/event-store";
import type { CartCreated, ItemAddedToCart, CartCleared } from "@store-checkout/core";
import { evolve } from "./ClearedCartItemsProjection";

function cartReadEvent<E extends CartCreated | ItemAddedToCart | CartCleared>(
  event: E,
  streamName: string
): ReadEvent<E, PostgresReadEventMetadata> {
  return {
    kind: "Event",
    ...event,
    metadata: { streamName, ...event.metadata },
  } as ReadEvent<E, PostgresReadEventMetadata>;
}

describe("ClearedCartItemsProjection", () => {
  const cartId = "11111111-1111-4111-8111-111111111111";

  it("snapshots lines on CartCleared", () => {
    const created = cartReadEvent<CartCreated>(
      {
        type: "CartCreated",
        data: { cart_id: cartId, items: [], created_at: 1 },
        metadata: { now: new Date(), causation_id: cartId },
      },
      cartId
    );
    let doc = evolve(null, created);

    const added = cartReadEvent<ItemAddedToCart>(
      {
        type: "ItemAddedToCart",
        data: {
          cart_id: cartId,
          stock_id: "33333333-3333-4333-8333-333333333333",
          item_id: "44444444-4444-4444-8444-444444444444",
          price_in_cents: 500,
          quantity: 2,
          added_at: 2,
        },
        metadata: { now: new Date(), causation_id: cartId },
      },
      cartId
    );
    doc = evolve(doc, added);

    const cleared = cartReadEvent<CartCleared>(
      {
        type: "CartCleared",
        data: { cart_id: cartId, cleared_at: 3 },
        metadata: { now: new Date(), causation_id: cartId },
      },
      cartId
    );
    doc = evolve(doc, cleared);

    expect(doc?.cleared_at).toBe(3);
    expect(doc?.items).toEqual([
      { item_id: "44444444-4444-4444-8444-444444444444", quantity: 2 },
    ]);
    expect(doc?.clearedLines).toHaveLength(1);
  });
});
