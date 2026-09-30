import { describe, it, beforeAll } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import {
  decide,
  evolve,
  initialState,
  handleReserveStockItem,
  type ReserveStockItemCommand,
} from "./ReserveStockItemCommand";
import type { StockItemReserved } from "@store-checkout/core";
import { CommandHandlerSpec } from "../../test-utils/command-handler-spec";
import { expectNewEvents } from "../../test-utils/helpers";
import { setupTestDatabase } from "../../test-utils/test-database";
import { runIntegrationTests } from "../../test-utils/integration";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("ReserveStockItem", () => {
  const stockId = randomUUID();
  const cartId = randomUUID();
  const itemId = randomUUID();
  const now = new Date();

  it("emits StockItemReserved when enough stock", () => {
    given([])
      .when({
        type: "ReserveStockItem",
        data: {
          stock_id: stockId,
          cart_id: cartId,
          item_id: itemId,
          quantity: 1,
          on_hand_quantity: 5,
        },
        metadata: { now, correlation_id: stockId, causation_id: stockId },
      })
      .then([
        {
          type: "StockItemReserved",
          data: {
            stock_id: stockId,
            cart_id: cartId,
            item_id: itemId,
            quantity: 1,
            reserved_at: now.getTime(),
          },
          metadata: {
            now,
            streamName: stockId,
            causation_id: stockId,
          },
        },
      ]);
  });

  it("throws Not enough stock error when quantity exceeds on-hand", () => {
    given([])
      .when({
        type: "ReserveStockItem",
        data: {
          stock_id: stockId,
          cart_id: cartId,
          item_id: itemId,
          quantity: 2,
          on_hand_quantity: 1,
        },
        metadata: { now, correlation_id: stockId, causation_id: stockId },
      })
      .thenThrows((error: Error) => error.message === "Not enough stock error");
  });

  it("throws Out of stock error when nothing left to reserve", () => {
    const pastEvent: StockItemReserved = {
      type: "StockItemReserved",
      data: {
        stock_id: stockId,
        cart_id: cartId,
        item_id: itemId,
        quantity: 1,
        reserved_at: now.getTime(),
      },
      metadata: { now, causation_id: stockId, streamName: stockId },
    };

    given([pastEvent])
      .when({
        type: "ReserveStockItem",
        data: {
          stock_id: stockId,
          cart_id: randomUUID(),
          item_id: itemId,
          quantity: 1,
          on_hand_quantity: 1,
        },
        metadata: { now, correlation_id: stockId, causation_id: stockId },
      })
      .thenThrows((error: Error) => error.message === "Out of stock error");
  });

  if (runIntegrationTests) {
    describe("Integration Tests", () => {
      let givenDb: ReturnType<
        typeof CommandHandlerSpec.for<ReserveStockItemCommand, StockItemReserved>
      >;

      beforeAll(async () => {
        const testDb = await setupTestDatabase();
        givenDb = CommandHandlerSpec.for({
          handler: handleReserveStockItem,
          connectionString: testDb.connectionString,
        });
      }, 60000);

      it("persists StockItemReserved to database", async () => {
        const streamId = randomUUID();
        const command: ReserveStockItemCommand = {
          type: "ReserveStockItem",
          data: {
            stock_id: streamId,
            cart_id: randomUUID(),
            item_id: randomUUID(),
            quantity: 2,
            on_hand_quantity: 10,
          },
          metadata: { now: new Date() },
        };

        const expectedEvent: StockItemReserved = {
          type: "StockItemReserved",
          data: {
            stock_id: streamId,
            cart_id: command.data.cart_id,
            item_id: command.data.item_id,
            quantity: 2,
            reserved_at: command.metadata!.now.getTime(),
          },
          metadata: {
            now: command.metadata!.now,
            causation_id: streamId,
            streamName: streamId,
          },
        };

        await givenDb([])
          .when(command)
          .then(expectNewEvents(streamId, [expectedEvent]));
      });
    });
  }
});
