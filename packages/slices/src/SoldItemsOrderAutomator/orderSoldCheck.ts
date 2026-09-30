import type { PostgresEventStore } from "@store-checkout/event-store";
import type { OrderCreated } from "@store-checkout/core";

async function countSoldQuantityForOrderLine(
  eventStore: PostgresEventStore,
  stockId: string,
  orderId: string,
  itemId: string
): Promise<number> {
  const { events } = await eventStore.readStream(stockId);
  let sold = 0;
  for (const event of events) {
    if (event.type !== "StockItemSold") {
      continue;
    }
    const soldEvent = event as unknown as {
      data: { order_id: string; item_id: string; quantity: number };
    };
    if (soldEvent.data.order_id === orderId && soldEvent.data.item_id === itemId) {
      sold += soldEvent.data.quantity;
    }
  }
  return sold;
}

export async function isOrderFullySold(
  eventStore: PostgresEventStore,
  order: OrderCreated["data"]
): Promise<boolean> {
  for (const line of order.items) {
    const sold = await countSoldQuantityForOrderLine(
      eventStore,
      line.stock_id,
      order.order_id,
      line.item_id
    );
    if (sold < line.quantity) {
      return false;
    }
  }
  return true;
}
