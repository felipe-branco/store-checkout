import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OrderPaid } from "@store-checkout/core";
import { handleOrderPaidAutomatorAutomation } from "./OrderPaidAutomatorAutomation";
import type { OrderPaidAutomatorContext } from "./OrderPaidAutomatorContext";

describe("OrderPaidAutomator", () => {
  const cartId = "11111111-1111-4111-8111-111111111111";
  const orderId = "22222222-2222-4222-8222-222222222222";
  const stockId = "33333333-3333-4333-8333-333333333333";
  const itemId = "44444444-4444-4444-8444-444444444444";

  let sendCommand: ReturnType<typeof vi.fn>;
  let context: OrderPaidAutomatorContext;

  beforeEach(() => {
    sendCommand = vi.fn().mockResolvedValue({ success: true, eventsPublished: 1 });
    context = {
      sendCommand,
      paymentWebhookUrl: "http://localhost:3000/api/webhooks/payment",
      eventStore: {
        readStream: vi.fn().mockResolvedValue({
          events: [
            {
              type: "OrderCreated",
              data: {
                cart_id: cartId,
                order_id: orderId,
                items: [
                  {
                    stock_id: stockId,
                    item_id: itemId,
                    price_in_cents: 500,
                    quantity: 2,
                  },
                ],
                total_in_cents: 1000,
                ordered_at: Date.now(),
              },
              metadata: {},
            },
          ],
        }),
      } as unknown as AutomationContext["eventStore"],
    };
  });

  it("dispatches SellStockItem for each order line", async () => {
    const event: OrderPaid = {
      type: "OrderPaid",
      data: {
        cart_id: cartId,
        order_id: orderId,
        paid_at: Date.now(),
        value_paid_in_cents: 1000,
        currency: "USD",
        payment_method: "CREDIT_CARD",
        status: "success",
      },
      metadata: { now: new Date(), causation_id: orderId },
    };

    await handleOrderPaidAutomatorAutomation(event, context);

    expect(sendCommand).toHaveBeenCalledTimes(1);
    const command = sendCommand.mock.calls[0]![0] as { type: string; data: Record<string, unknown> };
    expect(command.type).toBe("SellStockItem");
    expect(command.data).toMatchObject({
      stock_id: stockId,
      cart_id: cartId,
      order_id: orderId,
      item_id: itemId,
      quantity: 2,
    });
  });
});
