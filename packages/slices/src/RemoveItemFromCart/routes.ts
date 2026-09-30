import { z } from "zod";
import type { RemoveItemFromCartCommand } from "./RemoveItemFromCartCommand";
import type { ICommandDispatcher } from "@store-checkout/core";
import type { DereserveStockItemCommand } from "../DereserveStockItem/DereserveStockItemCommand";
import type { ReserveStockItemCommand } from "../ReserveStockItem/ReserveStockItemCommand";

export const RemoveItemFromCartSchema = z.object({
  cart_id: z.uuid(),
  stock_id: z.uuid(),
  item_id: z.uuid(),
  price_in_cents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  /** Static catalog on-hand count — used if cart remove fails after dereserve (re-reserve). */
  on_hand_quantity: z.number().int().nonnegative(),
});

export type RemoveItemFromCartRouteParams = z.input<typeof RemoveItemFromCartSchema>;

export interface RemoveItemFromCartRouteResponse {
  success: true;
}

export type RemoveItemFromCartRouteErrorCode =
  | "VALIDATION_ERROR"
  | "STOCK_DERESERVE_FAILED"
  | "CART_REMOVE_FAILED"
  | "UNKNOWN_ERROR";

export interface RemoveItemFromCartRouteError {
  success: false;
  error: string;
  code?: RemoveItemFromCartRouteErrorCode;
  failedCommandType?: string;
  correlationId?: string;
}

export type RemoveItemFromCartRouteResult =
  | RemoveItemFromCartRouteResponse
  | RemoveItemFromCartRouteError;

function routeCommandMetadata(cartId: string, correlationId?: string) {
  return {
    now: new Date(),
    correlation_id: correlationId,
    causation_id: cartId,
  };
}

export async function handleRemoveItemFromCartRoute(
  params: unknown,
  dispatcher: ICommandDispatcher,
  correlationId?: string,
  options?: { cartAlreadyCleared?: boolean }
): Promise<RemoveItemFromCartRouteResult> {
  try {
    const validated = RemoveItemFromCartSchema.parse(params);
    const { cart_id, stock_id, item_id, quantity, on_hand_quantity } = validated;
    const metadata = routeCommandMetadata(cart_id, correlationId);
    const cartAlreadyCleared = options?.cartAlreadyCleared === true;

    const dereserveCommand: DereserveStockItemCommand = {
      type: "DereserveStockItem",
      data: { stock_id, cart_id, item_id, quantity },
      metadata,
    };

    const dereserveResult = await dispatcher.sendCommand(dereserveCommand, correlationId);
    if (!dereserveResult.success) {
      return {
        success: false,
        error: dereserveResult.error.message,
        code: "STOCK_DERESERVE_FAILED",
        failedCommandType: "DereserveStockItem",
        correlationId: dereserveResult.error.correlationId ?? correlationId,
      };
    }
    if (dereserveResult.eventsPublished === 0) {
      return {
        success: false,
        error: "No stock reservation to release for this cart line",
        code: "STOCK_DERESERVE_FAILED",
        failedCommandType: "DereserveStockItem",
        correlationId,
      };
    }

    if (cartAlreadyCleared) {
      return { success: true };
    }

    const removeCommand: RemoveItemFromCartCommand = {
      type: "RemoveItemFromCart",
      data: {
        cart_id,
        stock_id,
        item_id,
        price_in_cents: validated.price_in_cents,
        quantity,
      },
      metadata,
    };

    const removeResult = await dispatcher.sendCommand(removeCommand, correlationId);
    if (!removeResult.success) {
      const reReserveCommand: ReserveStockItemCommand = {
        type: "ReserveStockItem",
        data: {
          stock_id,
          cart_id,
          item_id,
          quantity,
          on_hand_quantity,
        },
        metadata,
      };
      await dispatcher.sendCommand(reReserveCommand, correlationId);

      return {
        success: false,
        error: removeResult.error.message,
        code: "CART_REMOVE_FAILED",
        failedCommandType: "RemoveItemFromCart",
        correlationId: removeResult.error.correlationId ?? correlationId,
      };
    }
    if (removeResult.eventsPublished === 0) {
      const reReserveCommand: ReserveStockItemCommand = {
        type: "ReserveStockItem",
        data: {
          stock_id,
          cart_id,
          item_id,
          quantity,
          on_hand_quantity,
        },
        metadata,
      };
      await dispatcher.sendCommand(reReserveCommand, correlationId);

      return {
        success: false,
        error: "Cart line was not updated",
        code: "CART_REMOVE_FAILED",
        failedCommandType: "RemoveItemFromCart",
        correlationId,
      };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
        correlationId,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      code: "UNKNOWN_ERROR",
      correlationId,
    };
  }
}
