import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * CartCreated event
 *
 * Aggregate: Cart
 */
export type CartCreated = Event<
  "CartCreated",
  {
    cart_id: string;
    items: {
    item_id: string;
    quantity: number;
  }[];
    created_at: number;
  },
  EventMetadata
>;
