import type { OrderCreated } from "@store-checkout/core";
import type { WebhookSimulatorAutomatorContext } from "./WebhookSimulatorAutomatorContext";
import { consumePendingPaymentSimulation } from "./pendingPaymentSimulation";

function randomWebhookDelayMs(): number {
  return 300 + Math.floor(Math.random() * 1701);
}

/**
 * Webhook Simulator Automator — POSTs the external payment payload to the payment webhook.
 */
export async function handleWebhookSimulatorAutomatorAutomation(
  event: OrderCreated,
  context: WebhookSimulatorAutomatorContext
): Promise<void> {
  const { cart_id, order_id } = event.data;
  const pending = consumePendingPaymentSimulation(order_id);
  if (!pending) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, randomWebhookDelayMs()));

  const response = await fetch(context.paymentWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart_id,
      order_id,
      items: pending.webhookItems,
      value_paid: pending.valuePaid,
      currency: pending.currency,
      payment_method: pending.paymentMethod,
      status: pending.status,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Payment webhook failed (${response.status}): ${body}`);
  }
}
