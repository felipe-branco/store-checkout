import { describe, it, beforeAll } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import {
  decide,
  evolve,
  initialState,
  handleRemoveItemFromCart,
  type RemoveItemFromCartCommand,
} from "./RemoveItemFromCartCommand";
import type { Event } from "@store-checkout/event-store";
import type { CartCreated, ItemAddedToCart, ItemRemovedFromCart } from "@store-checkout/core";
import { CommandHandlerSpec } from "../../test-utils/command-handler-spec";
import { expectNewEvents } from "../../test-utils/helpers";
import { setupTestDatabase } from "../../test-utils/test-database";
import { runIntegrationTests } from "../../test-utils/integration";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("RemoveItemFromCart", () => {
  const cartId = randomUUID();
  const stockId = randomUUID();
  const itemId = randomUUID();
  const now = new Date();
  const priceInCents = 499;

  const cartCreated: CartCreated = {
    type: "CartCreated",
    data: {
      cart_id: cartId,
      items: [],
      created_at: now.getTime(),
    },
    metadata: { now, causation_id: cartId, streamName: cartId },
  };

  const itemAdded: ItemAddedToCart = {
    type: "ItemAddedToCart",
    data: {
      cart_id: cartId,
      stock_id: stockId,
      item_id: itemId,
      price_in_cents: priceInCents,
      quantity: 2,
      added_at: now.getTime(),
    },
    metadata: { now, causation_id: cartId, streamName: cartId },
  };

  it("emits ItemRemovedFromCart when line has enough quantity", () => {
    given([cartCreated, itemAdded] as Event[])
      .when({
        type: "RemoveItemFromCart",
        data: {
          cart_id: cartId,
          stock_id: stockId,
          item_id: itemId,
          price_in_cents: priceInCents,
          quantity: 1,
        },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .then([
        {
          type: "ItemRemovedFromCart",
          data: {
            cart_id: cartId,
            stock_id: stockId,
            item_id: itemId,
            price_in_cents: priceInCents,
            quantity: 1,
            removed_at: now.getTime(),
          },
          metadata: { now, causation_id: cartId, streamName: cartId },
        },
      ]);
  });

  it("does nothing when line quantity is insufficient", () => {
    given([cartCreated, itemAdded] as Event[])
      .when({
        type: "RemoveItemFromCart",
        data: {
          cart_id: cartId,
          stock_id: stockId,
          item_id: itemId,
          price_in_cents: priceInCents,
          quantity: 5,
        },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .then([]);
  });

  if (runIntegrationTests) {
    describe("Integration Tests", () => {
      let testDb: Awaited<ReturnType<typeof setupTestDatabase>>;
      let integrationGiven: ReturnType<
        typeof CommandHandlerSpec.for<RemoveItemFromCartCommand, ItemRemovedFromCart>
      >;

      beforeAll(async () => {
        testDb = await setupTestDatabase();
        integrationGiven = CommandHandlerSpec.for({
          handler: handleRemoveItemFromCart,
          connectionString: testDb.connectionString,
        });
      }, 60000);

      it("should persist ItemRemovedFromCart to database", async () => {
        const streamId = randomUUID();
        const nowIntegration = new Date();
        const stock = randomUUID();
        const item = randomUUID();
        const created: CartCreated = {
          type: "CartCreated",
          data: {
            cart_id: streamId,
            items: [],
            created_at: nowIntegration.getTime(),
          },
          metadata: { now: nowIntegration, causation_id: streamId, streamName: streamId },
        };
        const added: ItemAddedToCart = {
          type: "ItemAddedToCart",
          data: {
            cart_id: streamId,
            stock_id: stock,
            item_id: item,
            price_in_cents: priceInCents,
            quantity: 2,
            added_at: nowIntegration.getTime(),
          },
          metadata: { now: nowIntegration, causation_id: streamId, streamName: streamId },
        };

        const command: RemoveItemFromCartCommand = {
          type: "RemoveItemFromCart",
          data: {
            cart_id: streamId,
            stock_id: stock,
            item_id: item,
            price_in_cents: priceInCents,
            quantity: 1,
          },
          metadata: { now: nowIntegration },
        };

        await integrationGiven([{ streamId, events: [created, added] }])
          .when(command)
          .then(
            expectNewEvents(streamId, [
              {
                type: "ItemRemovedFromCart",
                data: {
                  cart_id: streamId,
                  stock_id: stock,
                  item_id: item,
                  price_in_cents: priceInCents,
                  quantity: 1,
                  removed_at: nowIntegration.getTime(),
                },
                metadata: {
                  now: nowIntegration,
                  causation_id: streamId,
                  streamName: streamId,
                },
              },
            ])
          );
      });
    });
  }
});
