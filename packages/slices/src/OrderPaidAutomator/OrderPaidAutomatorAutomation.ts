import type { OrderPaid } from "@store-checkout/core";
import type { SellStockItemCommand } from "../SellStockItem/SellStockItemCommand";
import type { OrderPaidAutomatorContext } from "./OrderPaidAutomatorContext";
import { findOrderCreatedByOrderId } from "./orderStreamLookup";

/**
 * Order Paid Automator — sells stock for each order line after payment succeeds.
 */
export async function handleOrderPaidAutomatorAutomation(
  event: OrderPaid,
  context: OrderPaidAutomatorContext
): Promise<void> {
  const { cart_id, order_id } = event.data;
  const order = await findOrderCreatedByOrderId(context.eventStore, cart_id, order_id);
  if (!order) {
    return;
  }

  const metadata = {
    now: new Date(),
    causation_id: order_id,
    correlation_id: event.metadata?.correlation_id as string | undefined,
  };

  for (const line of order.items) {
    const command: SellStockItemCommand = {
      type: "SellStockItem",
      data: {
        stock_id: line.stock_id,
        cart_id,
        order_id,
        item_id: line.item_id,
        quantity: line.quantity,
      },
      metadata,
    };
    await context.sendCommand(command, metadata.correlation_id);
  }
}
