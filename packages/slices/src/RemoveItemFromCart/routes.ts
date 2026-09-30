import { z } from "zod";
import type { RemoveItemFromCartCommand } from "./RemoveItemFromCartCommand";
import type { ICommandDispatcher } from "@store-checkout/core";

export const RemoveItemFromCartSchema = z.object({
  cart_id: z.uuid(),
  stock_id: z.uuid(),
  item_id: z.uuid(),
  price_in_cents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

export type RemoveItemFromCartRouteParams = z.input<typeof RemoveItemFromCartSchema>;

export interface RemoveItemFromCartRouteResponse {
  success: true;
}

export interface RemoveItemFromCartRouteError {
  success: false;
  error: string;
  code?: "VALIDATION_ERROR" | "UNKNOWN_ERROR";
  correlationId?: string;
}

export type RemoveItemFromCartRouteResult =
  | RemoveItemFromCartRouteResponse
  | RemoveItemFromCartRouteError;

export async function handleRemoveItemFromCartRoute(
  params: unknown,
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<RemoveItemFromCartRouteResult> {
  try {
    const validated = RemoveItemFromCartSchema.parse(params);
    const { cart_id } = validated;

    const command: RemoveItemFromCartCommand = {
      type: "RemoveItemFromCart",
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
