import { describe, it, beforeAll } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import {
  decide,
  evolve,
  initialState,
  handleDereserveStockItem,
  type DereserveStockItemCommand,
} from "./DereserveStockItemCommand";
import type { StockItemDereserved, StockItemReserved, StockItemSold } from "@store-checkout/core";
import { CommandHandlerSpec, existingStream } from "../../test-utils/command-handler-spec";
import { expectNewEvents } from "../../test-utils/helpers";
import { setupTestDatabase } from "../../test-utils/test-database";
import { runIntegrationTests } from "../../test-utils/integration";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("DereserveStockItem", () => {
  const stockId = randomUUID();
  const cartId = randomUUID();
  const itemId = randomUUID();
  const now = new Date();

  it("emits StockItemDereserved after a matching reservation", () => {
    const reserved: StockItemReserved = {
      type: "StockItemReserved",
      data: {
        stock_id: stockId,
        cart_id: cartId,
        item_id: itemId,
        quantity: 2,
        reserved_at: now.getTime(),
      },
      metadata: { now, causation_id: stockId, streamName: stockId },
    };

    // DeciderSpecification types `given` from this slice's output event; stream replay includes StockItemReserved.
    given([reserved] as unknown as StockItemDereserved[])
      .when({
        type: "DereserveStockItem",
        data: {
          stock_id: stockId,
          cart_id: cartId,
          item_id: itemId,
          quantity: 1,
        },
        metadata: { now, correlation_id: stockId, causation_id: stockId },
      })
      .then([
        {
          type: "StockItemDereserved",
          data: {
            stock_id: stockId,
            cart_id: cartId,
            item_id: itemId,
            quantity: 1,
            dereserved_at: now.getTime(),
          },
          metadata: {
            now,
            streamName: stockId,
            causation_id: stockId,
          },
        },
      ]);
  });

  it("does nothing when nothing was reserved for the cart line", () => {
    given([])
      .when({
        type: "DereserveStockItem",
        data: {
          stock_id: stockId,
          cart_id: cartId,
          item_id: itemId,
          quantity: 1,
        },
        metadata: { now, correlation_id: stockId, causation_id: stockId },
      })
      .then([]);
  });

  it("does nothing when the cart line was already sold (EM: do not dereserve sold item)", () => {
    const reserved: StockItemReserved = {
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
    const sold: StockItemSold = {
      type: "StockItemSold",
      data: {
        stock_id: stockId,
        cart_id: cartId,
        order_id: randomUUID(),
        item_id: itemId,
        quantity: 1,
        sold_at: now.getTime(),
      },
      metadata: { now, causation_id: stockId, streamName: stockId },
    };

    given([reserved, sold] as unknown as StockItemDereserved[])
      .when({
        type: "DereserveStockItem",
        data: {
          stock_id: stockId,
          cart_id: cartId,
          item_id: itemId,
          quantity: 1,
        },
        metadata: { now, correlation_id: stockId, causation_id: stockId },
      })
      .then([]);
  });

  if (runIntegrationTests) {
    describe("Integration Tests", () => {
      let givenDb: ReturnType<
        typeof CommandHandlerSpec.for<DereserveStockItemCommand, StockItemDereserved>
      >;

      beforeAll(async () => {
        const testDb = await setupTestDatabase();
        givenDb = CommandHandlerSpec.for({
          handler: handleDereserveStockItem,
          connectionString: testDb.connectionString,
        });
      }, 60000);

      it("persists StockItemDereserved to database", async () => {
        const streamId = randomUUID();
        const cart = randomUUID();
        const item = randomUUID();
        const reservedAt = new Date();
        const pastEvent: StockItemReserved = {
          type: "StockItemReserved",
          data: {
            stock_id: streamId,
            cart_id: cart,
            item_id: item,
            quantity: 3,
            reserved_at: reservedAt.getTime(),
          },
          metadata: { now: reservedAt, causation_id: streamId, streamName: streamId },
        };

        const command: DereserveStockItemCommand = {
          type: "DereserveStockItem",
          data: {
            stock_id: streamId,
            cart_id: cart,
            item_id: item,
            quantity: 1,
          },
          metadata: { now: new Date() },
        };

        const expectedEvent: StockItemDereserved = {
          type: "StockItemDereserved",
          data: {
            stock_id: streamId,
            cart_id: cart,
            item_id: item,
            quantity: 1,
            dereserved_at: command.metadata!.now.getTime(),
          },
          metadata: {
            now: command.metadata!.now,
            causation_id: streamId,
            streamName: streamId,
          },
        };

        await givenDb([existingStream(streamId, [pastEvent])])
          .when(command)
          .then(expectNewEvents(streamId, [expectedEvent]));
      });
    });
  }
});
