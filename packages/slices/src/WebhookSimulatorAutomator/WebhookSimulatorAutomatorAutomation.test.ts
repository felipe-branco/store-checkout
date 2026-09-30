import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { OrderCreated } from "@store-checkout/core";
import { handleWebhookSimulatorAutomatorAutomation } from "./WebhookSimulatorAutomatorAutomation";
import {
  registerPendingPaymentSimulation,
  consumePendingPaymentSimulation,
} from "./pendingPaymentSimulation";
import type { WebhookSimulatorAutomatorContext } from "./WebhookSimulatorAutomatorContext";

describe("WebhookSimulatorAutomator", () => {
  const cartId = "11111111-1111-4111-8111-111111111111";
  const orderId = "22222222-2222-4222-8222-222222222222";

  let fetchMock: ReturnType<typeof vi.fn>;
  let context: WebhookSimulatorAutomatorContext;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    context = {
      paymentWebhookUrl: "http://localhost:3000/api/webhooks/payment",
    };
    registerPendingPaymentSimulation(orderId, {
      status: "success",
      paymentMethod: "CREDIT_CARD",
      valuePaid: 1000,
      currency: "USD",
      webhookItems: [
        {
          stock_id: "33333333-3333-4333-8333-333333333333",
          item_id: "44444444-4444-4444-8444-444444444444",
          price_in_cents: 500,
          quantity: 2,
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    consumePendingPaymentSimulation(orderId);
  });

  it("POSTs payment webhook payload after delay", async () => {
    const event: OrderCreated = {
      type: "OrderCreated",
      data: {
        cart_id: cartId,
        order_id: orderId,
        items: [],
        total_in_cents: 1000,
        ordered_at: Date.now(),
      },
      metadata: { now: new Date(), causation_id: cartId },
    };

    const pending = handleWebhookSimulatorAutomatorAutomation(event, context);
    await vi.advanceTimersByTimeAsync(2000);
    await pending;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(context.paymentWebhookUrl);
    expect(JSON.parse(String(init.body))).toMatchObject({
      cart_id: cartId,
      order_id: orderId,
      status: "success",
      payment_method: "CREDIT_CARD",
    });
  });
});
