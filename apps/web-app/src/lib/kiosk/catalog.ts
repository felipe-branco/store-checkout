import type { OrderItemInput, PaymentMethod, Product } from "@store-checkout/ui";
import { MAX_QTY_PER_ITEM } from "@store-checkout/ui";
import { getCatalogProductById, INITIAL_PRODUCT_CATALOG } from "./product-catalog";

/** Until reserved/sold projections exist, kiosk `stock` = static catalog `quantity`. */
function catalogRowToProduct(row: (typeof INITIAL_PRODUCT_CATALOG)[number]): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.priceInCents,
    image: row.image,
    category: row.category,
    stock: row.quantity,
  };
}

export function listProducts(): Product[] {
  return INITIAL_PRODUCT_CATALOG.map(catalogRowToProduct);
}

const PAYMENT_METHODS: PaymentMethod[] = ["credit", "debit", "tap"];

export function validateOrderPayload(
  body: unknown
):
  | { ok: true; items: OrderItemInput[]; paymentMethod: PaymentMethod; idempotencyKey: string }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "Invalid order." };
  const { items, paymentMethod, idempotencyKey } = body as Record<string, unknown>;

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

  return {
    ok: true,
    items: Array.from(merged, ([productId, quantity]) => ({ productId, quantity })),
    paymentMethod: paymentMethod as PaymentMethod,
    idempotencyKey,
  };
}
