import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * StockItemReserved event
 *
 * Aggregate: Stock
 */
export type StockItemReserved = Event<
  "StockItemReserved",
  {
    stock_id: string;
    cart_id: string;
    item_id: string;
    quantity: number;
    reserved_at: number;
  },
  EventMetadata
>;
