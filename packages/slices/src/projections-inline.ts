import { projections } from "@store-checkout/event-store";
import { CartDetailsProjection } from "./CartDetails/CartDetailsProjection";
import { StockProductsListProjection } from "./CartDetails/stockProductsListProjection";

/** Single source for inline Emmett projections registered at app startup. */
export type InlineProjection = Parameters<typeof projections.inline>[0][number];

export const INLINE_PROJECTIONS: InlineProjection[] = [
  CartDetailsProjection as InlineProjection,
  StockProductsListProjection as InlineProjection,
];
