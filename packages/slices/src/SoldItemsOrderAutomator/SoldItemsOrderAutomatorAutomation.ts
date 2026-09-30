import type { StockItemSold } from "@store-checkout/core";
import type { FinishOrderCommand } from "../FinishOrder/FinishOrderCommand";
import type { SoldItemsOrderAutomatorContext } from "../OrderPaidAutomator/OrderPaidAutomatorContext";
import { findOrderCreatedByOrderId } from "../OrderPaidAutomator/orderStreamLookup";
import { isOrderFullySold } from "./orderSoldCheck";

/**
 * Sold Items Order Automator — finishes the order once every line is sold.
 */
export async function handleSoldItemsOrderAutomatorAutomation(
  event: StockItemSold,
  context: SoldItemsOrderAutomatorContext
): Promise<void> {
  const { cart_id, order_id } = event.data;
  const order = await findOrderCreatedByOrderId(context.eventStore, cart_id, order_id);
  if (!order) {
    return;
  }

  const fullySold = await isOrderFullySold(context.eventStore, order);
  if (!fullySold) {
    return;
  }

  const command: FinishOrderCommand = {
    type: "FinishOrder",
    data: { cart_id, order_id },
    metadata: {
      now: new Date(),
      causation_id: order_id,
      correlation_id: event.metadata?.correlation_id as string | undefined,
    },
  };

  await context.sendCommand(command, command.metadata.correlation_id);
}
