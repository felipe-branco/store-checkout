import { describe, it, expect, vi } from "vitest";
import type { StockItemSold } from "@store-checkout/core";
import { handleSoldItemsOrderAutomatorAutomation } from "./SoldItemsOrderAutomatorAutomation";
import type { SoldItemsOrderAutomatorContext } from "../OrderPaidAutomator/OrderPaidAutomatorContext";

describe("SoldItemsOrderAutomator", () => {
  const cartId = "11111111-1111-4111-8111-111111111111";
  const orderId = "22222222-2222-4222-8222-222222222222";
  const stockId = "33333333-3333-4333-8333-333333333333";
  const itemId = "44444444-4444-4444-8444-444444444444";

  it("dispatches FinishOrder when all lines are sold", async () => {
    const sendCommand = vi.fn().mockResolvedValue({ success: true, eventsPublished: 1 });
    const context: SoldItemsOrderAutomatorContext = {
      sendCommand,
      eventStore: {
        readStream: vi.fn(async (streamId: string) => {
          if (streamId === cartId) {
            return {
              events: [
                {
                  type: "OrderCreated",
                  data: {
                    cart_id: cartId,
                    order_id: orderId,
                    items: [{ stock_id: stockId, item_id: itemId, price_in_cents: 500, quantity: 1 }],
                    total_in_cents: 500,
                    ordered_at: Date.now(),
                  },
                  metadata: {},
                },
              ],
            };
          }
          return {
            events: [
              {
                type: "StockItemSold",
                data: {
                  stock_id: stockId,
                  cart_id: cartId,
                  order_id: orderId,
                  item_id: itemId,
                  quantity: 1,
                  sold_at: Date.now(),
                },
                metadata: {},
              },
            ],
          };
        }),
      } as unknown as SoldItemsOrderAutomatorContext["eventStore"],
    };

    const event: StockItemSold = {
      type: "StockItemSold",
      data: {
        stock_id: stockId,
        cart_id: cartId,
        order_id: orderId,
        item_id: itemId,
        quantity: 1,
        sold_at: Date.now(),
      },
      metadata: { now: new Date(), causation_id: orderId },
    };

    await handleSoldItemsOrderAutomatorAutomation(event, context);

    expect(sendCommand).toHaveBeenCalledTimes(1);
    const command = sendCommand.mock.calls[0]![0] as { type: string; data: { cart_id: string; order_id: string } };
    expect(command.type).toBe("FinishOrder");
    expect(command.data).toEqual({ cart_id: cartId, order_id: orderId });
  });
});
