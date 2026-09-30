import { z } from "zod";
import type { ICommandDispatcher, SendResult } from "@store-checkout/core";
import type { ExternalPaymentSimulatorPayload } from "@store-checkout/core";
import type { PayOrderCommand } from "../PayOrder/PayOrderCommand";
import type { FailOrderPaymentCommand } from "../FailOrderPayment/FailOrderPaymentCommand";

const lineItemSchema = z.object({
  stock_id: z.uuid(),
  item_id: z.uuid(),
  price_in_cents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

export const ExternalPaymentWebhookSchema = z.object({
  external_id: z.uuid().optional(),
  cart_id: z.uuid(),
  order_id: z.uuid(),
  items: z.array(lineItemSchema).min(1),
  value_paid: z.number().int().nonnegative(),
  currency: z.string().min(1),
  payment_method: z.string().min(1),
  status: z.enum(["success", "fail"]),
});

export type ExternalPaymentWebhookBody = z.infer<typeof ExternalPaymentWebhookSchema>;

export function parseExternalPaymentPayload(
  payload: unknown
): ExternalPaymentSimulatorPayload {
  const validated = ExternalPaymentWebhookSchema.parse(payload);
  return {
    type: "ExternalPaymentSimulatorPayload",
    data: {
      external_id: validated.external_id ?? crypto.randomUUID(),
      cart_id: validated.cart_id,
      order_id: validated.order_id,
      items: validated.items,
      value_paid: validated.value_paid,
      currency: validated.currency,
      payment_method: validated.payment_method,
      status: validated.status,
    },
    metadata: {},
  };
}

export async function translateExternalPaymentSimulator(
  externalEvent: ExternalPaymentSimulatorPayload,
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<SendResult> {
  const { data } = externalEvent;
  const metadata = {
    now: new Date(),
    correlation_id: correlationId,
    causation_id: data.order_id,
  };

  if (data.status === "success") {
    const payCommand: PayOrderCommand = {
      type: "PayOrder",
      data: {
        cart_id: data.cart_id,
        order_id: data.order_id,
        value_paid_in_cents: data.value_paid,
        currency: data.currency,
        payment_method: data.payment_method,
        status: data.status,
      },
      metadata,
    };

    const payResult = await dispatcher.sendCommand(payCommand, correlationId);
    if (!payResult.success) {
      return payResult;
    }
    if (payResult.eventsPublished === 0) {
      return {
        success: false,
        error: {
          code: "BUSINESS_RULE_VIOLATION",
          message: "PayOrder did not apply",
          commandType: "PayOrder",
        },
      };
    }

    return payResult;
  }

  const failCommand: FailOrderPaymentCommand = {
    type: "FailOrderPayment",
    data: {
      cart_id: data.cart_id,
      order_id: data.order_id,
      currency: data.currency,
      payment_method: data.payment_method,
      status: data.status,
    },
    metadata,
  };

  return dispatcher.sendCommand(failCommand, correlationId);
}

export interface ExternalPaymentWebhookRouteResponse {
  success: true;
  paymentStatus: "success" | "fail";
}

export interface ExternalPaymentWebhookRouteError {
  success: false;
  error: string;
  code?: "VALIDATION_ERROR" | "TRANSLATION_FAILED";
  correlationId?: string;
}

export type ExternalPaymentWebhookRouteResult =
  | ExternalPaymentWebhookRouteResponse
  | ExternalPaymentWebhookRouteError;

export async function handleExternalPaymentSimulatorRoute(
  payload: unknown,
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<ExternalPaymentWebhookRouteResult> {
  try {
    const externalEvent = parseExternalPaymentPayload(payload);
    const result = await translateExternalPaymentSimulator(
      externalEvent,
      dispatcher,
      correlationId
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
        code: "TRANSLATION_FAILED",
        correlationId: result.error.correlationId ?? correlationId,
      };
    }

    if (result.eventsPublished === 0) {
      return {
        success: false,
        error: "Payment command produced no events",
        code: "TRANSLATION_FAILED",
        correlationId,
      };
    }

    return {
      success: true,
      paymentStatus: externalEvent.data.status,
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
      code: "TRANSLATION_FAILED",
      correlationId,
    };
  }
}
