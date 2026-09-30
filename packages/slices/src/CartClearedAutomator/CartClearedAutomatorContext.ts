import type { PongoDb } from "@store-checkout/event-store";
import type { ClearedCartItemsReadModel } from "./ClearedCartItemsProjection";

export type CartLineCatalogRow = {
  stock_id: string;
  price_in_cents: number;
  on_hand_quantity: number;
};

export type CartClearedAutomatorContext = {
  getClearedCartItems: (cartId: string) => Promise<ClearedCartItemsReadModel | null>;
  resolveCartLineCatalog: (itemId: string) => CartLineCatalogRow | null;
};

export function createCartClearedAutomatorContext(deps: {
  pongoDb: PongoDb;
  resolveCartLineCatalog: CartClearedAutomatorContext["resolveCartLineCatalog"];
  getClearedCartItemsById: (
    db: PongoDb,
    cartId: string
  ) => Promise<ClearedCartItemsReadModel | null>;
}): CartClearedAutomatorContext {
  return {
    resolveCartLineCatalog: deps.resolveCartLineCatalog,
    getClearedCartItems: (cartId) => deps.getClearedCartItemsById(deps.pongoDb, cartId),
  };
}
