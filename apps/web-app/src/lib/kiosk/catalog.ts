import type {
  CreateOrderResponse,
  OrderItemInput,
  PaymentMethod,
  Product,
  StockConflict,
} from "@store-checkout/ui";
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

interface OrderStore {
  processed: Map<string, CreateOrderResponse>;
  orderCounter: number;
}

const globalForStore = globalThis as unknown as { __storeCheckoutOrders?: OrderStore };

const orderStore: OrderStore =
  globalForStore.__storeCheckoutOrders ??
  (globalForStore.__storeCheckoutOrders = {
    processed: new Map(),
    orderCounter: 40,
  });

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

export function placeOrder(items: OrderItemInput[], idempotencyKey: string): CreateOrderResponse {
  const previous = orderStore.processed.get(idempotencyKey);
  if (previous) return previous;

  const byId = new Map(listProducts().map((p) => [p.id, p]));

  const conflicts: StockConflict[] = [];
  for (const { productId, quantity } of items) {
    const product = byId.get(productId);
    if (!product) {
      return { ok: false, error: "invalid", message: "Item not found." };
    }
    if (product.stock < quantity) {
      conflicts.push({
        productId,
        name: product.name,
        requested: quantity,
        available: product.stock,
      });
    }
  }
  if (conflicts.length > 0) return { ok: false, error: "stock", conflicts };

  let total = 0;
  let itemCount = 0;
  for (const { productId, quantity } of items) {
    const product = byId.get(productId)!;
    total += product.price * quantity;
    itemCount += quantity;
  }

  orderStore.orderCounter = orderStore.orderCounter >= 999 ? 1 : orderStore.orderCounter + 1;
  const result: CreateOrderResponse = {
    ok: true,
    order: {
      orderNumber: String(orderStore.orderCounter).padStart(3, "0"),
      itemCount,
      total,
    },
  };
  orderStore.processed.set(idempotencyKey, result);
  return result;
}
