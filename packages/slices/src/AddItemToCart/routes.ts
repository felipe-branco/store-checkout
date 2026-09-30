import { z } from "zod";
import type { AddItemToCartCommand } from "./AddItemToCartCommand";
import type { ICommandDispatcher } from "@store-checkout/core";

export const AddItemToCartSchema = z.object({
  cart_id: z.uuid(),
  stock_id: z.uuid(),
  item_id: z.uuid(),
  price_in_cents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

export type AddItemToCartRouteParams = z.input<typeof AddItemToCartSchema>;

export interface AddItemToCartRouteResponse {
  success: true;
}

export interface AddItemToCartRouteError {
  success: false;
  error: string;
  code?: "VALIDATION_ERROR" | "UNKNOWN_ERROR";
  correlationId?: string;
}

export type AddItemToCartRouteResult =
  | AddItemToCartRouteResponse
  | AddItemToCartRouteError;

export async function handleAddItemToCartRoute(
  params: unknown,
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<AddItemToCartRouteResult> {
  try {
    const validated = AddItemToCartSchema.parse(params);
    const { cart_id } = validated;

    const command: AddItemToCartCommand = {
      type: "AddItemToCart",
      data: validated,
      metadata: {
        now: new Date(),
        correlation_id: correlationId,
        causation_id: cart_id,
      },
    };

    const result = await dispatcher.sendCommand(command, correlationId);
    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
        code: "UNKNOWN_ERROR",
        correlationId: result.error.correlationId ?? correlationId,
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
