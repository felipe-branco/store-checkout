import { describe, it, beforeAll } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import {
  decide,
  evolve,
  initialState,
  handleSellStockItem,
  type SellStockItemCommand,
} from "./SellStockItemCommand";
import type { StockItemSold } from "@store-checkout/core";
import { CommandHandlerSpec, existingStream } from "../../test-utils/command-handler-spec";
import { expectNewEvents } from "../../test-utils/helpers";
import { setupTestDatabase } from "../../test-utils/test-database";
import { runIntegrationTests } from "../../test-utils/integration";

const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("SellStockItem", () => {
  const stockId = randomUUID();
  const cartId = randomUUID();
  const orderId = randomUUID();
  const itemId = randomUUID();
  const now = new Date();

  it("emits StockItemSold on first sell for order line", () => {
    given([])
      .when({
        type: "SellStockItem",
        data: {
          stock_id: stockId,
          cart_id: cartId,
          order_id: orderId,
          item_id: itemId,
          quantity: 2,
        },
        metadata: { now, correlation_id: stockId, causation_id: stockId },
      })
      .then([
        {
          type: "StockItemSold",
          data: {
            stock_id: stockId,
            cart_id: cartId,
            order_id: orderId,
            item_id: itemId,
            quantity: 2,
            sold_at: now.getTime(),
          },
        },
      ]);
  });

  it("does nothing when the same order line was already sold (idempotent)", () => {
    const sold: StockItemSold = {
      type: "StockItemSold",
      data: {
        stock_id: stockId,
        cart_id: cartId,
        order_id: orderId,
        item_id: itemId,
        quantity: 2,
        sold_at: now.getTime(),
      },
      metadata: { now, causation_id: stockId, streamName: stockId },
    };

    given([sold])
      .when({
        type: "SellStockItem",
        data: {
          stock_id: stockId,
          cart_id: cartId,
          order_id: orderId,
          item_id: itemId,
          quantity: 2,
        },
        metadata: { now, correlation_id: stockId, causation_id: stockId },
      })
      .then([]);
  });

  if (runIntegrationTests) {
    describe("Integration Tests", () => {
      let givenDb: ReturnType<
        typeof CommandHandlerSpec.for<SellStockItemCommand, StockItemSold>
      >;

      beforeAll(async () => {
        const testDb = await setupTestDatabase();
        givenDb = CommandHandlerSpec.for({
          handler: handleSellStockItem,
          connectionString: testDb.connectionString,
        });
      }, 60000);

      it("persists StockItemSold to database", async () => {
        const streamId = randomUUID();
        const command: SellStockItemCommand = {
          type: "SellStockItem",
          data: {
            stock_id: streamId,
            cart_id: randomUUID(),
            order_id: randomUUID(),
            item_id: randomUUID(),
            quantity: 1,
          },
          metadata: { now: new Date() },
        };

        const expectedEvent: StockItemSold = {
          type: "StockItemSold",
          data: {
            stock_id: streamId,
            cart_id: command.data.cart_id,
            order_id: command.data.order_id,
            item_id: command.data.item_id,
            quantity: 1,
            sold_at: command.metadata.now.getTime(),
          },
          metadata: {
            now: command.metadata.now,
            causation_id: streamId,
            streamName: streamId,
          },
        };

        await givenDb([])
          .when(command)
          .then(expectNewEvents(streamId, [expectedEvent]));
      });

      it("is idempotent for duplicate sell commands", async () => {
        const streamId = randomUUID();
        const soldAt = new Date();
        const pastEvent: StockItemSold = {
          type: "StockItemSold",
          data: {
            stock_id: streamId,
            cart_id: randomUUID(),
            order_id: randomUUID(),
            item_id: randomUUID(),
            quantity: 1,
            sold_at: soldAt.getTime(),
          },
          metadata: { now: soldAt, causation_id: streamId, streamName: streamId },
        };

        const command: SellStockItemCommand = {
          type: "SellStockItem",
          data: {
            stock_id: streamId,
            cart_id: pastEvent.data.cart_id,
            order_id: pastEvent.data.order_id,
            item_id: pastEvent.data.item_id,
            quantity: 1,
          },
          metadata: { now: new Date() },
        };

        await givenDb([existingStream(streamId, [pastEvent])])
          .when(command)
          .then(expectNewEvents(streamId, [] as StockItemSold[]));
      });
    });
  }
});
