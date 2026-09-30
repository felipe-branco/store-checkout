import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CartCleared } from "@store-checkout/core";
import { handleCartClearedAutomatorAutomation } from "./CartClearedAutomatorAutomation";
import type { CartClearedAutomatorContext } from "./CartClearedAutomatorContext";
import type { ICommandDispatcher } from "@store-checkout/core";
import * as removeRoutes from "../RemoveItemFromCart/routes";

describe("CartClearedAutomator", () => {
  const cartId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.spyOn(removeRoutes, "handleRemoveItemFromCartRoute").mockResolvedValue({ success: true });
  });

  it("runs Remove Item from Cart orchestration for cleared lines", async () => {
    const dispatcher = { sendCommand: vi.fn() } as unknown as ICommandDispatcher;

    const context: CartClearedAutomatorContext = {
      resolveCartLineCatalog: () => ({
        stock_id: "33333333-3333-4333-8333-333333333333",
        price_in_cents: 500,
        on_hand_quantity: 10,
      }),
      getClearedCartItems: vi.fn().mockResolvedValue({
        cart_id: cartId,
        items: [{ item_id: "44444444-4444-4444-8444-444444444444", quantity: 2 }],
        created_at: Date.now(),
        cleared_at: Date.now(),
        clearedLines: [
          {
            item_id: "44444444-4444-4444-8444-444444444444",
            stock_id: "33333333-3333-4333-8333-333333333333",
            price_in_cents: 500,
            quantity: 2,
          },
        ],
      }),
    };

    const event: CartCleared = {
      type: "CartCleared",
      data: { cart_id: cartId, cleared_at: Date.now() },
      metadata: { now: new Date(), causation_id: cartId },
    };

    await handleCartClearedAutomatorAutomation(event, context, dispatcher);

    expect(removeRoutes.handleRemoveItemFromCartRoute).toHaveBeenCalledTimes(1);
    expect(removeRoutes.handleRemoveItemFromCartRoute.mock.calls[0]![3]).toEqual({
      cartAlreadyCleared: true,
    });
  });
});
