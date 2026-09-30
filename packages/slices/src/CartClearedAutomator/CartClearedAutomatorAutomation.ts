import type { CartCleared } from "@store-checkout/core";
import type { ICommandDispatcher } from "@store-checkout/core";
import { handleRemoveItemFromCartRoute } from "../RemoveItemFromCart/routes";
import type { CartClearedAutomatorContext } from "./CartClearedAutomatorContext";

/**
 * Cart Cleared Automator — Remove Item from Cart orchestration (dereserve) per cleared line.
 */
export async function handleCartClearedAutomatorAutomation(
  event: CartCleared,
  context: CartClearedAutomatorContext,
  dispatcher: ICommandDispatcher
): Promise<void> {
  const { cart_id } = event.data;
  const cleared = await context.getClearedCartItems(cart_id);
  if (!cleared?.cleared_at || cleared.clearedLines.length === 0) {
    return;
  }

  const correlationId = event.metadata?.correlation_id as string | undefined;

  for (const line of cleared.clearedLines) {
    const catalog = context.resolveCartLineCatalog(line.item_id);
    if (!catalog) {
      continue;
    }

    await handleRemoveItemFromCartRoute(
      {
        cart_id,
        stock_id: line.stock_id,
        item_id: line.item_id,
        price_in_cents: line.price_in_cents,
        quantity: line.quantity,
        on_hand_quantity: catalog.on_hand_quantity,
      },
      dispatcher,
      correlationId,
      { cartAlreadyCleared: true }
    );
  }
}
