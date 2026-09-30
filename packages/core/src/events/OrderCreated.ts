import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * OrderCreated event
 *
 * Aggregate: Cart
 */
export type OrderCreated = Event<
  "OrderCreated",
  {
    cart_id: string;
    order_id: string;
    items: {
    stock_id: string;
    item_id: string;
    price_in_cents: number;
    quantity: number;
  }[];
    total_in_cents: number;
    ordered_at: number;
  },
  EventMetadata
>;
