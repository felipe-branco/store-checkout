import { evolve as cartDetailsEvolve } from "./CartDetails/CartDetailsProjection";
import { evolveStockProductsList } from "./CartDetails/stockProductsListProjection";
import { evolve as paymentFailedOrderEvolve } from "./PaymentFailedOrder/PaymentFailedOrderProjection";
import { evolve as orderFinishedDetailsEvolve } from "./OrderFinishedDetails/OrderFinishedDetailsProjection";
import { evolve as clearedCartItemsEvolve } from "./CartClearedAutomator/ClearedCartItemsProjection";

export type ManualRebuildConfig = {
  collectionName: string;
  canHandle: string[];
  evolve: (state: unknown, event: { type: string; data?: unknown }) => unknown;
  getDocumentId?: (event: { type: string; data?: unknown }, streamId: string) => string | undefined;
};

/** Keys must match `PROJECTION_REGISTRY` in projections-registry.ts */
export const MANUAL_REBUILD_CONFIG: Record<string, ManualRebuildConfig> = {
  CartDetails: {
    collectionName: "cartdetails-collection",
    canHandle: ["CartCreated", "ItemAddedToCart", "ItemRemovedFromCart", "CartCleared"],
    evolve: cartDetailsEvolve as ManualRebuildConfig["evolve"],
  },
  StockProductsList: {
    collectionName: "stock-products-list-collection",
    canHandle: ["StockItemReserved", "StockItemDereserved", "StockItemSold"],
    evolve: evolveStockProductsList as ManualRebuildConfig["evolve"],
  },
  PaymentFailedOrder: {
    collectionName: "paymentfailedorder-collection",
    canHandle: ["OrderCreated", "OrderPaymentFailed", "OrderPaid", "OrderFinished"],
    evolve: paymentFailedOrderEvolve as ManualRebuildConfig["evolve"],
  },
  OrderFinishedDetails: {
    collectionName: "orderfinisheddetails-collection",
    canHandle: ["OrderCreated", "OrderPaid", "OrderFinished", "OrderPaymentFailed"],
    evolve: orderFinishedDetailsEvolve as ManualRebuildConfig["evolve"],
  },
  ClearedCartItems: {
    collectionName: "clearedcartitems-collection",
    canHandle: ["CartCreated", "ItemAddedToCart", "ItemRemovedFromCart", "CartCleared"],
    evolve: clearedCartItemsEvolve as ManualRebuildConfig["evolve"],
  },
};
