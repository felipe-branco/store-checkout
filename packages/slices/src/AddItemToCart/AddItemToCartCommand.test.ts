import { describe, it, beforeAll } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import {
  decide,
  evolve,
  initialState,
  handleAddItemToCart,
  type AddItemToCartCommand,
} from "./AddItemToCartCommand";
import type { Event } from "@store-checkout/event-store";
import type { CartCreated, ItemAddedToCart, ItemRemovedFromCart, CartCleared } from "@store-checkout/core";
import { CommandHandlerSpec } from "../../test-utils/command-handler-spec";
import { expectNewEvents } from "../../test-utils/helpers";
import { setupTestDatabase } from "../../test-utils/test-database";
import { runIntegrationTests } from "../../test-utils/integration";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("AddItemToCart", () => {
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

  it("emits ItemAddedToCart when cart exists", () => {
    given([cartCreated] as Event[])
      .when({
        type: "AddItemToCart",
        data: {
          cart_id: cartId,
          stock_id: stockId,
          item_id: itemId,
          price_in_cents: priceInCents,
          quantity: 2,
        },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .then([
        {
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
        },
      ]);
  });

  it("throws when cart does not exist", () => {
    given([])
      .when({
        type: "AddItemToCart",
        data: {
          cart_id: cartId,
          stock_id: stockId,
          item_id: itemId,
          price_in_cents: priceInCents,
          quantity: 1,
        },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .thenThrows((error: Error) => error.message === "Cart does not exist");
  });

  if (runIntegrationTests) {
    describe("Integration Tests", () => {
      let testDb: Awaited<ReturnType<typeof setupTestDatabase>>;
      let integrationGiven: ReturnType<
        typeof CommandHandlerSpec.for<AddItemToCartCommand, ItemAddedToCart>
      >;

      beforeAll(async () => {
        testDb = await setupTestDatabase();
        integrationGiven = CommandHandlerSpec.for({
          handler: handleAddItemToCart,
          connectionString: testDb.connectionString,
        });
      }, 60000);

      it("should persist ItemAddedToCart to database", async () => {
        const streamId = randomUUID();
        const nowIntegration = new Date();
        const created: CartCreated = {
          type: "CartCreated",
          data: {
            cart_id: streamId,
            items: [],
            created_at: nowIntegration.getTime(),
          },
          metadata: { now: nowIntegration, causation_id: streamId, streamName: streamId },
        };

        const stock = randomUUID();
        const item = randomUUID();
        const command: AddItemToCartCommand = {
          type: "AddItemToCart",
          data: {
            cart_id: streamId,
            stock_id: stock,
            item_id: item,
            price_in_cents: priceInCents,
            quantity: 1,
          },
          metadata: { now: nowIntegration },
        };

        await integrationGiven([{ streamId, events: [created] }])
          .when(command)
          .then(
            expectNewEvents(streamId, [
              {
                type: "ItemAddedToCart",
                data: {
                  cart_id: streamId,
                  stock_id: stock,
                  item_id: item,
                  price_in_cents: priceInCents,
                  quantity: 1,
                  added_at: nowIntegration.getTime(),
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
