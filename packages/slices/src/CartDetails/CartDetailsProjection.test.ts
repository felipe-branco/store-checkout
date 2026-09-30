import { describe, it, expect } from "vitest";
import type { ReadEvent, PostgresReadEventMetadata } from "@store-checkout/event-store";
import type { CartCreated, ItemAddedToCart, CartCleared } from "@store-checkout/core";
import { evolve } from "./CartDetailsProjection";
import { buildStockProductsList } from "./buildStockProductsList";

describe("CartDetailsProjection", () => {
  const cartId = "cart-123";
  const now = new Date();

  it("projects CartCreated", () => {
    const event: ReadEvent<CartCreated, PostgresReadEventMetadata> = {
      type: "CartCreated",
      data: {
        cart_id: cartId,
        items: [],
        created_at: now.getTime(),
      },
      metadata: { streamName: cartId } as ReadEvent<CartCreated, PostgresReadEventMetadata>["metadata"],
    };

    const result = evolve(null, event);
    expect(result).toEqual({
      cart_id: cartId,
      items: [],
      created_at: now.getTime(),
    });
  });

  it("merges ItemAddedToCart lines by item_id", () => {
    const created: ReadEvent<CartCreated, PostgresReadEventMetadata> = {
      type: "CartCreated",
      data: {
        cart_id: cartId,
        items: [],
        created_at: now.getTime(),
      },
      metadata: { streamName: cartId } as ReadEvent<CartCreated, PostgresReadEventMetadata>["metadata"],
    };
    const doc = evolve(null, created);

    const added: ReadEvent<ItemAddedToCart, PostgresReadEventMetadata> = {
      type: "ItemAddedToCart",
      data: {
        cart_id: cartId,
        stock_id: "stock-1",
        item_id: "item-a",
        price_in_cents: 250,
        quantity: 2,
        added_at: now.getTime(),
      },
      metadata: { streamName: cartId } as ReadEvent<CartCreated, PostgresReadEventMetadata>["metadata"],
    };

    const afterFirst = evolve(doc, added);
    const afterSecond = evolve(afterFirst, {
      ...added,
      data: { ...added.data, quantity: 1 },
    });

    expect(afterSecond?.items).toEqual([{ item_id: "item-a", quantity: 3 }]);
  });

  it("clears items on CartCleared", () => {
    const created: ReadEvent<CartCreated, PostgresReadEventMetadata> = {
      type: "CartCreated",
      data: {
        cart_id: cartId,
        items: [],
        created_at: now.getTime(),
      },
      metadata: { streamName: cartId } as ReadEvent<CartCreated, PostgresReadEventMetadata>["metadata"],
    };
    let doc = evolve(null, created);
    doc = evolve(doc, {
      type: "ItemAddedToCart",
      data: {
        cart_id: cartId,
        stock_id: "stock-1",
        item_id: "item-a",
        price_in_cents: 250,
        quantity: 1,
        added_at: now.getTime(),
      },
      metadata: { streamName: cartId } as ReadEvent<CartCreated, PostgresReadEventMetadata>["metadata"],
    });

    const cleared: ReadEvent<CartCleared, PostgresReadEventMetadata> = {
      type: "CartCleared",
      data: {
        cart_id: cartId,
        cleared_at: now.getTime(),
      },
      metadata: { streamName: cartId } as ReadEvent<CartCreated, PostgresReadEventMetadata>["metadata"],
    };

    expect(evolve(doc, cleared)?.items).toEqual([]);
  });
});

describe("buildStockProductsList", () => {
  it("computes available stock from catalog minus reserved and sold", () => {
    const products = buildStockProductsList(
      [
        {
          id: "croquettes",
          itemId: "item-1",
          stockId: "stock-1",
          name: "Croquettes",
          description: "Test",
          priceInCents: 100,
          image: "/x.png",
          category: "snacks",
          quantity: 10,
        },
      ],
      {
        reservedByItem: { "item-1": 3 },
        soldByItem: { "item-1": 2 },
      }
    );

    expect(products[0]?.stock).toBe(5);
  });
});
