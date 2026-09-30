import type { PongoDb } from "@store-checkout/event-store";
import {
  getCartDetailsById,
  type CartDetailsReadModel,
} from "./CartDetailsProjection";
import {
  getStockAvailabilityByStockId,
  type StockAvailabilityReadModel,
} from "./stockProductsListProjection";
import {
  buildStockProductsList,
  type StockProductsListCatalogRow,
} from "./buildStockProductsList";
import type { Product } from "@store-checkout/ui";

export interface CartDetailsRouteParams {
  cartId: string;
}

export interface CartDetailsRouteResponse {
  success: true;
  data: CartDetailsReadModel | null;
}

export interface CartDetailsRouteError {
  success: false;
  error: string;
}

export type CartDetailsRouteResult = CartDetailsRouteResponse | CartDetailsRouteError;

export async function handleCartDetailsRoute(
  params: CartDetailsRouteParams,
  db: PongoDb
): Promise<CartDetailsRouteResult> {
  try {
    const data = await getCartDetailsById(db, params.cartId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export interface StockProductsListRouteParams {
  stockId: string;
  catalog: StockProductsListCatalogRow[];
}

export interface StockProductsListRouteResponse {
  success: true;
  data: Product[];
}

export interface StockProductsListRouteError {
  success: false;
  error: string;
}

export type StockProductsListRouteResult =
  | StockProductsListRouteResponse
  | StockProductsListRouteError;

export async function handleStockProductsListRoute(
  params: StockProductsListRouteParams,
  db: PongoDb
): Promise<StockProductsListRouteResult> {
  try {
    const availabilityDoc = await getStockAvailabilityByStockId(db, params.stockId);
    const availability: StockAvailabilityReadModel = availabilityDoc ?? {
      stock_id: params.stockId,
      reservedByItem: {},
      soldByItem: {},
    };
    const data = buildStockProductsList(params.catalog, {
      reservedByItem: availability.reservedByItem,
      soldByItem: availability.soldByItem,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export function catalogRowsToKioskCart(
  readModel: CartDetailsReadModel | null,
  catalog: StockProductsListCatalogRow[]
): Record<string, number> {
  if (!readModel) {
    return {};
  }
  const productIdByItemId = new Map(catalog.map((row) => [row.itemId, row.id]));
  const cart: Record<string, number> = {};
  for (const line of readModel.items) {
    const productId = productIdByItemId.get(line.item_id);
    if (productId) {
      cart[productId] = line.quantity;
    }
  }
  return cart;
}
