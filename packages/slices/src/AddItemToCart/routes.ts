import { z } from "zod";
import type { AddItemToCartCommand } from "./AddItemToCartCommand";
import type { ICommandDispatcher } from "@store-checkout/core";
import type { ReserveStockItemCommand } from "../ReserveStockItem/ReserveStockItemCommand";
import type { DereserveStockItemCommand } from "../DereserveStockItem/DereserveStockItemCommand";

export const AddItemToCartSchema = z.object({
  cart_id: z.uuid(),
  stock_id: z.uuid(),
  item_id: z.uuid(),
  price_in_cents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  /** Static catalog on-hand count for ReserveStockItem availability check. */
  on_hand_quantity: z.number().int().nonnegative(),
});

export type AddItemToCartRouteParams = z.input<typeof AddItemToCartSchema>;

export interface AddItemToCartRouteResponse {
  success: true;
}

export type AddItemToCartRouteErrorCode =
  | "VALIDATION_ERROR"
  | "STOCK_RESERVE_FAILED"
  | "CART_ADD_FAILED"
  | "UNKNOWN_ERROR";

export interface AddItemToCartRouteError {
  success: false;
  error: string;
  code?: AddItemToCartRouteErrorCode;
  failedCommandType?: string;
  correlationId?: string;
}

export type AddItemToCartRouteResult =
  | AddItemToCartRouteResponse
  | AddItemToCartRouteError;

function routeCommandMetadata(cartId: string, correlationId?: string) {
  return {
    now: new Date(),
    correlation_id: correlationId,
    causation_id: cartId,
  };
}

export async function handleAddItemToCartRoute(
  params: unknown,
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<AddItemToCartRouteResult> {
  try {
    const validated = AddItemToCartSchema.parse(params);
    const { cart_id, stock_id, item_id, quantity, on_hand_quantity } = validated;
    const metadata = routeCommandMetadata(cart_id, correlationId);

    const reserveCommand: ReserveStockItemCommand = {
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

    const reserveResult = await dispatcher.sendCommand(reserveCommand, correlationId);
    if (!reserveResult.success) {
      return {
        success: false,
        error: reserveResult.error.message,
        code: "STOCK_RESERVE_FAILED",
        failedCommandType: "ReserveStockItem",
        correlationId: reserveResult.error.correlationId ?? correlationId,
      };
    }
    if (reserveResult.eventsPublished === 0) {
      return {
        success: false,
        error: "Stock was not reserved",
        code: "STOCK_RESERVE_FAILED",
        failedCommandType: "ReserveStockItem",
        correlationId,
      };
    }

    const addCommand: AddItemToCartCommand = {
      type: "AddItemToCart",
      data: {
        cart_id,
        stock_id,
        item_id,
        price_in_cents: validated.price_in_cents,
        quantity,
      },
      metadata,
    };

    const addResult = await dispatcher.sendCommand(addCommand, correlationId);
    if (!addResult.success) {
      const dereserveCommand: DereserveStockItemCommand = {
        type: "DereserveStockItem",
        data: { stock_id, cart_id, item_id, quantity },
        metadata,
      };
      await dispatcher.sendCommand(dereserveCommand, correlationId);

      return {
        success: false,
        error: addResult.error.message,
        code: "CART_ADD_FAILED",
        failedCommandType: "AddItemToCart",
        correlationId: addResult.error.correlationId ?? correlationId,
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
