/**
 * Server-only slice exports (event-store, Pongo, pg).
 * Use in API routes, message bus, and projections — never in Client Components.
 */

export type { CartDetailsReadModel } from "./src/CartDetails/CartDetailsProjection";
export type { StockProductsListCatalogRow } from "./src/CartDetails/buildStockProductsList";
export {
  buildStockProductsList,
  type StockAvailabilitySnapshot,
} from "./src/CartDetails/buildStockProductsList";
export {
  handleCartDetailsRoute,
  handleStockProductsListRoute,
  catalogRowsToKioskCart,
  handleOrderCheckoutStatusRoute,
  type OrderCheckoutStatus,
  type OrderCheckoutStatusRouteResult,
} from "./src/CartDetails/routes";

export { handleCreateCartRoute } from "./src/CreateCart/routes";
export { handleAddItemToCartRoute } from "./src/AddItemToCart/routes";
export { handleRemoveItemFromCartRoute } from "./src/RemoveItemFromCart/routes";
export { handleClearCartRoute } from "./src/ClearCart/routes";
export {
  handleCreateOrderRoute,
  orderDisplayNumber,
  mapPaymentMethodToEm,
  type OrderLineItem,
} from "./src/CreateOrder/routes";
export {
  handleExternalPaymentSimulatorRoute,
  ExternalPaymentWebhookSchema,
  type ExternalPaymentWebhookBody,
} from "./src/ExternalPaymentSimulatorTranslator/routes";
export type { PaymentFailedOrderReadModel } from "./src/PaymentFailedOrder/PaymentFailedOrderProjection";
export type { OrderFinishedDetailsReadModel } from "./src/OrderFinishedDetails/OrderFinishedDetailsProjection";

export { registerAllCommandHandlers } from "./src/commands";
export { registerAllAutomations } from "./src/automations";
export { INLINE_PROJECTIONS } from "./src/projections-inline";
export type { InlineProjection } from "./src/projections-inline";
