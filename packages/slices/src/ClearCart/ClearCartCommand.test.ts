import { describe, it, beforeAll } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import {
  decide,
  evolve,
  initialState,
  handleClearCart,
  type ClearCartCommand,
} from "./ClearCartCommand";
import type { Event } from "@store-checkout/event-store";
import type { CartCreated, CartCleared, ItemAddedToCart } from "@store-checkout/core";
import { CommandHandlerSpec } from "../../test-utils/command-handler-spec";
import { expectNewEvents } from "../../test-utils/helpers";
import { setupTestDatabase } from "../../test-utils/test-database";
import { runIntegrationTests } from "../../test-utils/integration";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("ClearCart", () => {
  const cartId = randomUUID();
  const now = new Date();

  const cartCreated: CartCreated = {
    type: "CartCreated",
    data: {
      cart_id: cartId,
      items: [],
      created_at: now.getTime(),
    },
    metadata: { now, causation_id: cartId, streamName: cartId },
  };

  it("emits CartCleared when cart exists", () => {
    given([cartCreated] as Event[])
      .when({
        type: "ClearCart",
        data: { cart_id: cartId },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .then([
        {
          type: "CartCleared",
          data: {
            cart_id: cartId,
            cleared_at: now.getTime(),
          },
          metadata: { now, causation_id: cartId, streamName: cartId },
        },
      ]);
  });

  it("throws when cart does not exist", () => {
    given([])
      .when({
        type: "ClearCart",
        data: { cart_id: cartId },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .thenThrows((error: Error) => error.message === "Cart does not exist");
  });

  it("can clear again after items were added post-clearance", () => {
    const itemAdded: ItemAddedToCart = {
      type: "ItemAddedToCart",
      data: {
        cart_id: cartId,
        stock_id: randomUUID(),
        item_id: randomUUID(),
        price_in_cents: 100,
        quantity: 1,
        added_at: now.getTime(),
      },
      metadata: { now, causation_id: cartId, streamName: cartId },
    };
    const cleared: CartCleared = {
      type: "CartCleared",
      data: {
        cart_id: cartId,
        cleared_at: now.getTime(),
      },
      metadata: { now, causation_id: cartId, streamName: cartId },
    };

    given([cartCreated, itemAdded, cleared, itemAdded] as Event[])
      .when({
        type: "ClearCart",
        data: { cart_id: cartId },
        metadata: { now, correlation_id: cartId, causation_id: cartId },
      })
      .then([
        {
          type: "CartCleared",
          data: {
            cart_id: cartId,
            cleared_at: now.getTime(),
          },
          metadata: { now, causation_id: cartId, streamName: cartId },
        },
      ]);
  });

  if (runIntegrationTests) {
    describe("Integration Tests", () => {
      let testDb: Awaited<ReturnType<typeof setupTestDatabase>>;
      let integrationGiven: ReturnType<
        typeof CommandHandlerSpec.for<ClearCartCommand, CartCleared>
      >;

      beforeAll(async () => {
        testDb = await setupTestDatabase();
        integrationGiven = CommandHandlerSpec.for({
          handler: handleClearCart,
          connectionString: testDb.connectionString,
        });
      }, 60000);

      it("should persist CartCleared to database", async () => {
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

        const command: ClearCartCommand = {
          type: "ClearCart",
          data: { cart_id: streamId },
          metadata: { now: nowIntegration },
        };

        await integrationGiven([{ streamId, events: [created] }])
          .when(command)
          .then(
            expectNewEvents(streamId, [
              {
                type: "CartCleared",
                data: {
                  cart_id: streamId,
                  cleared_at: nowIntegration.getTime(),
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
