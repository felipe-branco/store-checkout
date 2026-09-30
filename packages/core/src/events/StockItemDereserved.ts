import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * StockItemDereserved event
 *
 * Aggregate: Stock
 */
export type StockItemDereserved = Event<
  "StockItemDereserved",
  {
    stock_id: string;
    cart_id: string;
    item_id: string;
    quantity: number;
    dereserved_at: number;
  },
  EventMetadata
>;
