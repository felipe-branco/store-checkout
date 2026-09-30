import { z } from "zod";
import type { CreateCartCommand } from "./CreateCartCommand";
import type { ICommandDispatcher } from "@store-checkout/core";

export const CreateCartSchema = z.object({
  cart_id: z.uuid().optional(),
});

export type CreateCartRouteParams = z.input<typeof CreateCartSchema>;

export interface CreateCartRouteResponse {
  success: true;
  cart_id: string;
}

export interface CreateCartRouteError {
  success: false;
  error: string;
  code?: "VALIDATION_ERROR" | "UNKNOWN_ERROR";
  correlationId?: string;
}

export type CreateCartRouteResult = CreateCartRouteResponse | CreateCartRouteError;

export async function handleCreateCartRoute(
  params: unknown,
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<CreateCartRouteResult> {
  try {
    const validated = CreateCartSchema.parse(params ?? {});
    const cart_id = validated.cart_id ?? crypto.randomUUID();

    const command: CreateCartCommand = {
      type: "CreateCart",
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

    return { success: true, cart_id };
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
