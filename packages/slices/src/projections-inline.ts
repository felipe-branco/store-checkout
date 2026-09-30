import { projections } from "@store-checkout/event-store";
import { CartDetailsProjection } from "./CartDetails/CartDetailsProjection";
import { StockProductsListProjection } from "./CartDetails/stockProductsListProjection";
import { PaymentFailedOrderProjection } from "./PaymentFailedOrder/PaymentFailedOrderProjection";
import { OrderFinishedDetailsProjection } from "./OrderFinishedDetails/OrderFinishedDetailsProjection";
import { ClearedCartItemsProjection } from "./CartClearedAutomator/ClearedCartItemsProjection";

/** Single source for inline Emmett projections registered at app startup. */
export type InlineProjection = Parameters<typeof projections.inline>[0][number];

export const INLINE_PROJECTIONS: InlineProjection[] = [
  CartDetailsProjection as InlineProjection,
  StockProductsListProjection as InlineProjection,
  PaymentFailedOrderProjection as InlineProjection,
  OrderFinishedDetailsProjection as InlineProjection,
  ClearedCartItemsProjection as InlineProjection,
];
