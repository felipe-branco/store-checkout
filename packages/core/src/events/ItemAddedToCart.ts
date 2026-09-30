import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * ItemAddedToCart event
 *
 * Aggregate: Cart
 */
export type ItemAddedToCart = Event<
  "ItemAddedToCart",
  {
    cart_id: string;
    stock_id: string;
    item_id: string;
    price_in_cents: number;
    quantity: number;
    added_at: number;
  },
  EventMetadata
>;
