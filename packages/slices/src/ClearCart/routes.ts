import { z } from "zod";
import type { ClearCartCommand } from "./ClearCartCommand";
import type { ICommandDispatcher } from "@store-checkout/core";

export const ClearCartSchema = z.object({
  cart_id: z.uuid(),
});

export type ClearCartRouteParams = z.input<typeof ClearCartSchema>;

export interface ClearCartRouteResponse {
  success: true;
}

export interface ClearCartRouteError {
  success: false;
  error: string;
  code?: "VALIDATION_ERROR" | "UNKNOWN_ERROR";
  correlationId?: string;
}

export type ClearCartRouteResult = ClearCartRouteResponse | ClearCartRouteError;

export async function handleClearCartRoute(
  params: unknown,
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<ClearCartRouteResult> {
  try {
    const validated = ClearCartSchema.parse(params);
    const { cart_id } = validated;

    const command: ClearCartCommand = {
      type: "ClearCart",
      data: { cart_id },
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
