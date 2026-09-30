import { z } from "zod";
import type { CreateOrderCommand, OrderLineItem } from "./CreateOrderCommand";
import type { ICommandDispatcher } from "@store-checkout/core";

const orderLineSchema = z.object({
  stock_id: z.uuid(),
  item_id: z.uuid(),
  price_in_cents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  cart_id: z.uuid(),
  order_id: z.uuid(),
  items: z.array(orderLineSchema).min(1),
  total_in_cents: z.number().int().nonnegative(),
});

export type CreateOrderRouteParams = z.input<typeof CreateOrderSchema>;

export interface CreateOrderRouteResponse {
  success: true;
  orderCreated: boolean;
}

export interface CreateOrderRouteError {
  success: false;
  error: string;
  code?: "VALIDATION_ERROR" | "UNKNOWN_ERROR";
  correlationId?: string;
}

export type CreateOrderRouteResult = CreateOrderRouteResponse | CreateOrderRouteError;

export async function handleCreateOrderRoute(
  params: unknown,
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<CreateOrderRouteResult> {
  try {
    const validated = CreateOrderSchema.parse(params);
    const { cart_id } = validated;

    const command: CreateOrderCommand = {
      type: "CreateOrder",
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

    return {
      success: true,
      orderCreated: result.eventsPublished > 0,
    };
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

export type { OrderLineItem };

export function orderDisplayNumber(orderId: string): string {
  const hex = orderId.replace(/-/g, "").slice(0, 8);
  const n = Number.parseInt(hex, 16);
  if (Number.isNaN(n)) {
    return "000";
  }
  return String((n % 900) + 100);
}

export function mapPaymentMethodToEm(method: string): string {
  switch (method) {
    case "credit":
      return "CREDIT_CARD";
    case "debit":
      return "DEBIT_CARD";
    case "tap":
      return "TAP_TO_PAY";
    default:
      return method.toUpperCase();
  }
}
