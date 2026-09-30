import type { Category, Product } from "@store-checkout/ui";

export type StockProductsListCatalogRow = {
  id: string;
  itemId: string;
  stockId: string;
  name: string;
  description: string;
  priceInCents: number;
  image: string;
  category: Category;
  quantity: number;
};

export type StockAvailabilitySnapshot = {
  reservedByItem: Record<string, number>;
  soldByItem: Record<string, number>;
};

export function buildStockProductsList(
  catalog: StockProductsListCatalogRow[],
  availability: StockAvailabilitySnapshot
): Product[] {
  return catalog.map((row) => {
    const reserved = availability.reservedByItem[row.itemId] ?? 0;
    const sold = availability.soldByItem[row.itemId] ?? 0;
    const available = Math.max(0, row.quantity - reserved - sold);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.priceInCents,
      image: row.image,
      category: row.category,
      stock: available,
    };
  });
}
