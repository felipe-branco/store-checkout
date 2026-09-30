import type { OrderItemInput, PaymentMethod } from "@store-checkout/ui";
import { MAX_QTY_PER_ITEM } from "@store-checkout/ui";
import { getCatalogProductById } from "./product-catalog";

const PAYMENT_METHODS: PaymentMethod[] = ["credit", "debit", "tap"];

export function validateOrderPayload(
  body: unknown
):
  | {
      ok: true;
      items: OrderItemInput[];
      paymentMethod: PaymentMethod;
      idempotencyKey: string;
      simulationStatus?: "success" | "fail";
    }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "Invalid order." };
  const { items, paymentMethod, idempotencyKey, simulationStatus } = body as Record<string, unknown>;

  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8 || idempotencyKey.length > 64) {
    return { ok: false, message: "Invalid payment session." };
  }
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
    return { ok: false, message: "Invalid payment method." };
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return { ok: false, message: "Your order is empty." };
  }

  const merged = new Map<string, number>();
  for (const item of items) {
    const { productId, quantity } = (item ?? {}) as Record<string, unknown>;
    if (typeof productId !== "string" || !getCatalogProductById(productId)) {
      return { ok: false, message: "Item not found." };
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, message: "Invalid quantity." };
    }
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  for (const qty of merged.values()) {
    if (qty > MAX_QTY_PER_ITEM) return { ok: false, message: "Quantity is over the limit." };
  }

  let parsedSimulation: "success" | "fail" | undefined;
  if (simulationStatus !== undefined && simulationStatus !== null && simulationStatus !== "") {
    if (simulationStatus !== "success" && simulationStatus !== "fail") {
      return { ok: false, message: "Invalid payment simulation." };
    }
    parsedSimulation = simulationStatus;
  }

  return {
    ok: true,
    items: Array.from(merged, ([productId, quantity]) => ({ productId, quantity })),
    paymentMethod: paymentMethod as PaymentMethod,
    idempotencyKey,
    simulationStatus: parsedSimulation,
  };
}
