import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * StockItemSold event
 *
 * Aggregate: Stock
 */
export type StockItemSold = Event<
  "StockItemSold",
  {
    stock_id: string;
    cart_id: string;
    order_id: string;
    item_id: string;
    quantity: number;
    sold_at: number;
  },
  EventMetadata
>;
