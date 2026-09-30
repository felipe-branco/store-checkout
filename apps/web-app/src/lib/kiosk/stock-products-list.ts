import type { StockProductsListCatalogRow } from "@store-checkout/slices/server";
import { INITIAL_PRODUCT_CATALOG } from "./product-catalog";

export function getStockProductsListCatalogRows(): StockProductsListCatalogRow[] {
  return INITIAL_PRODUCT_CATALOG.map((row) => ({
    id: row.id,
    itemId: row.itemId,
    stockId: row.stockId,
    name: row.name,
    description: row.description,
    priceInCents: row.priceInCents,
    image: row.image,
    category: row.category,
    quantity: row.quantity,
  }));
}

export function getDefaultStockId(): string {
  const first = INITIAL_PRODUCT_CATALOG[0];
  if (!first) {
    throw new Error("Product catalog is empty");
  }
  return first.stockId;
}

export function getCatalogRowByProductId(productId: string) {
  return INITIAL_PRODUCT_CATALOG.find((row) => row.id === productId);
}
