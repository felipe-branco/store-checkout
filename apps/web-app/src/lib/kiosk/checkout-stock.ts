import type { Cart, OrderItemInput, Product, StockConflict } from "@store-checkout/ui";

/**
 * Checkout-time stock conflicts when the frozen payment payload no longer matches
 * the server cart (e.g. session cleared, partial dereserve, or race while paying).
 */
export function buildCheckoutStockConflicts(
  items: OrderItemInput[],
  kioskCart: Cart,
  products: Product[]
): StockConflict[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const conflicts: StockConflict[] = [];

  for (const { productId, quantity } of items) {
    const inCart = kioskCart[productId] ?? 0;
    if (quantity <= inCart) {
      continue;
    }
    const product = byId.get(productId);
    conflicts.push({
      productId,
      name: product?.name ?? productId,
      requested: quantity,
      available: inCart,
    });
  }

  return conflicts;
}
