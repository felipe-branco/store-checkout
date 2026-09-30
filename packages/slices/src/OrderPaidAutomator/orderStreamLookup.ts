import type { PostgresEventStore } from "@store-checkout/event-store";
import type { OrderCreated } from "@store-checkout/core";

export async function findOrderCreatedByOrderId(
  eventStore: PostgresEventStore,
  cartId: string,
  orderId: string
): Promise<OrderCreated["data"] | null> {
  const { events } = await eventStore.readStream(cartId);
  for (const event of events) {
    if (event.type !== "OrderCreated") {
      continue;
    }
    const created = event as unknown as OrderCreated;
    if (created.data.order_id === orderId) {
      return created.data;
    }
  }
  return null;
}
