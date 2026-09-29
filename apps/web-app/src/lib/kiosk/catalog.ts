import type {
  CreateOrderResponse,
  OrderItemInput,
  PaymentMethod,
  Product,
  StockConflict,
} from "@store-checkout/ui";
import { MAX_QTY_PER_ITEM } from "@store-checkout/ui";

const SEED: Product[] = [
  {
    id: "croquettes",
    name: "Chicken Croquettes",
    description: "Two, with creamy filling",
    price: 450,
    image: "/products/coxinha.png",
    category: "snacks",
    stock: 14,
  },
  {
    id: "cheese-bread",
    name: "Cheese Bread Bites",
    description: "Five warm pieces",
    price: 399,
    image: "/products/pao-de-queijo.png",
    category: "snacks",
    stock: 3,
  },
  {
    id: "empanada",
    name: "Cheese Empanada",
    description: "Crispy, fried to order",
    price: 549,
    image: "/products/pastel.png",
    category: "snacks",
    stock: 0,
  },
  {
    id: "fries",
    name: "French Fries",
    description: "Regular size",
    price: 399,
    image: "/products/batata.png",
    category: "snacks",
    stock: 20,
  },
  {
    id: "hot-dog",
    name: "Classic Hot Dog",
    description: "Mustard and ketchup",
    price: 599,
    image: "/products/hot-dog.png",
    category: "sandwiches",
    stock: 8,
  },
  {
    id: "grilled-cheese",
    name: "Ham & Cheese Melt",
    description: "Toasted on the griddle",
    price: 749,
    image: "/products/sanduiche.png",
    category: "sandwiches",
    stock: 6,
  },
  {
    id: "orange-juice",
    name: "Orange Juice",
    description: "Fresh squeezed, 12 oz",
    price: 449,
    image: "/products/suco-laranja.png",
    category: "drinks",
    stock: 10,
  },
  {
    id: "soda",
    name: "Soda",
    description: "12 oz can",
    price: 249,
    image: "/products/refrigerante.png",
    category: "drinks",
    stock: 24,
  },
  {
    id: "water",
    name: "Bottled Water",
    description: "Still, 16.9 oz",
    price: 199,
    image: "/products/agua.png",
    category: "drinks",
    stock: 30,
  },
  {
    id: "espresso",
    name: "Espresso",
    description: "Double shot",
    price: 349,
    image: "/products/cafe.png",
    category: "drinks",
    stock: 40,
  },
  {
    id: "truffles",
    name: "Chocolate Truffles",
    description: "Box of three",
    price: 299,
    image: "/products/brigadeiro.png",
    category: "sweets",
    stock: 2,
  },
  {
    id: "acai",
    name: "Açaí Bowl",
    description: "Granola and banana",
    price: 899,
    image: "/products/acai.png",
    category: "sweets",
    stock: 0,
  },
];

interface Store {
  products: Map<string, Product>;
  processed: Map<string, CreateOrderResponse>;
  orderCounter: number;
}

const globalForStore = globalThis as unknown as { __storeKioskUS?: Store };

const store: Store =
  globalForStore.__storeKioskUS ??
  (globalForStore.__storeKioskUS = {
    products: new Map(SEED.map((p) => [p.id, { ...p }])),
    processed: new Map(),
    orderCounter: 40,
  });

export function listProducts(): Product[] {
  return Array.from(store.products.values());
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
    if (typeof productId !== "string" || !store.products.has(productId)) {
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
  const previous = store.processed.get(idempotencyKey);
  if (previous) return previous;

  const conflicts: StockConflict[] = [];
  for (const { productId, quantity } of items) {
    const product = store.products.get(productId)!;
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
    const product = store.products.get(productId)!;
    product.stock -= quantity;
    total += product.price * quantity;
    itemCount += quantity;
  }

  store.orderCounter = store.orderCounter >= 999 ? 1 : store.orderCounter + 1;
  const result: CreateOrderResponse = {
    ok: true,
    order: {
      orderNumber: String(store.orderCounter).padStart(3, "0"),
      total,
      itemCount,
    },
  };
  store.processed.set(idempotencyKey, result);
  return result;
}
