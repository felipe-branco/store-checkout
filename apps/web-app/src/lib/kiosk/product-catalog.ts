import { v5 as uuidv5 } from "uuid";
import type { Category } from "@store-checkout/ui";

/**
 * Static kiosk menu (EM `initial_products`). No DB seed.
 *
 * **`quantity`** is initial on-hand for commands and the Stock Products List formula:
 * `available = quantity − reserved − sold` (see `GET /api/products` + Pongo projection).
 * Do not mutate this array at runtime.
 */

/** Inventory pool (EM `stock_id`). Products on the same source share one `stockId`. */
export type StockSource = {
  id: string;
  name: string;
  stockId: string;
};

const CATALOG_ID_NAMESPACE = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

/** Add entries here when the menu spans multiple inventory pools (e.g. back room vs counter). */
export const STOCK_SOURCES: readonly StockSource[] = [
  {
    id: "store",
    name: "Store counter inventory",
    stockId: uuidv5("stock-source:store", CATALOG_ID_NAMESPACE),
  },
] as const;

export type StockSourceId = (typeof STOCK_SOURCES)[number]["id"];

const DEFAULT_STOCK_SOURCE_ID: StockSourceId = "store";

const stockSourceById = new Map(STOCK_SOURCES.map((source) => [source.id, source]));

export function getStockSource(id: string): StockSource | undefined {
  return stockSourceById.get(id);
}

function stockIdForSource(sourceId: string): string {
  const source = getStockSource(sourceId);
  if (!source) {
    throw new Error(`Unknown stock source: ${sourceId}`);
  }
  return source.stockId;
}

function itemIdForProduct(productId: string): string {
  return uuidv5(`item:${productId}`, CATALOG_ID_NAMESPACE);
}

export type CatalogProduct = {
  id: string;
  stockSourceId: StockSourceId;
  /** Shared by all products on the same {@link stockSourceId}. */
  stockId: string;
  itemId: string;
  name: string;
  description: string;
  priceInCents: number;
  image: string;
  category: Category;
  /** Initial on-hand count from this static array. */
  quantity: number;
};

type CatalogSeedRow = Omit<CatalogProduct, "stockId" | "itemId" | "stockSourceId">;

const ROWS: CatalogSeedRow[] = [
  {
    id: "croquettes",
    name: "Chicken Croquettes",
    description: "Two, with creamy filling",
    priceInCents: 450,
    image: "/products/coxinha.png",
    category: "snacks",
    quantity: 14,
  },
  {
    id: "cheese-bread",
    name: "Cheese Bread Bites",
    description: "Five warm pieces",
    priceInCents: 399,
    image: "/products/pao-de-queijo.png",
    category: "snacks",
    quantity: 3,
  },
  {
    id: "empanada",
    name: "Cheese Empanada",
    description: "Crispy, fried to order",
    priceInCents: 549,
    image: "/products/pastel.png",
    category: "snacks",
    quantity: 0,
  },
  {
    id: "fries",
    name: "French Fries",
    description: "Regular size",
    priceInCents: 399,
    image: "/products/batata.png",
    category: "snacks",
    quantity: 20,
  },
  {
    id: "hot-dog",
    name: "Classic Hot Dog",
    description: "Mustard and ketchup",
    priceInCents: 599,
    image: "/products/hot-dog.png",
    category: "sandwiches",
    quantity: 8,
  },
  {
    id: "grilled-cheese",
    name: "Ham & Cheese Melt",
    description: "Toasted on the griddle",
    priceInCents: 749,
    image: "/products/sanduiche.png",
    category: "sandwiches",
    quantity: 6,
  },
  {
    id: "orange-juice",
    name: "Orange Juice",
    description: "Fresh squeezed, 12 oz",
    priceInCents: 449,
    image: "/products/suco-laranja.png",
    category: "drinks",
    quantity: 10,
  },
  {
    id: "soda",
    name: "Soda",
    description: "12 oz can",
    priceInCents: 249,
    image: "/products/refrigerante.png",
    category: "drinks",
    quantity: 24,
  },
  {
    id: "water",
    name: "Bottled Water",
    description: "Still, 16.9 oz",
    priceInCents: 199,
    image: "/products/agua.png",
    category: "drinks",
    quantity: 30,
  },
  {
    id: "espresso",
    name: "Espresso",
    description: "Double shot",
    priceInCents: 349,
    image: "/products/cafe.png",
    category: "drinks",
    quantity: 40,
  },
  {
    id: "truffles",
    name: "Chocolate Truffles",
    description: "Box of three",
    priceInCents: 299,
    image: "/products/brigadeiro.png",
    category: "sweets",
    quantity: 2,
  },
  {
    id: "acai",
    name: "Açaí Bowl",
    description: "Granola and banana",
    priceInCents: 899,
    image: "/products/acai.png",
    category: "sweets",
    quantity: 0,
  },
];

export const INITIAL_PRODUCT_CATALOG: CatalogProduct[] = ROWS.map((row) => ({
  ...row,
  stockSourceId: DEFAULT_STOCK_SOURCE_ID,
  stockId: stockIdForSource(DEFAULT_STOCK_SOURCE_ID),
  itemId: itemIdForProduct(row.id),
}));

export function getCatalogProductById(productId: string): CatalogProduct | undefined {
  return INITIAL_PRODUCT_CATALOG.find((p) => p.id === productId);
}
