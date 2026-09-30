import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * ItemRemovedFromCart event
 *
 * Aggregate: Cart
 */
export type ItemRemovedFromCart = Event<
  "ItemRemovedFromCart",
  {
    cart_id: string;
    stock_id: string;
    item_id: string;
    price_in_cents: number;
    quantity: number;
    removed_at: number;
  },
  EventMetadata
>;
