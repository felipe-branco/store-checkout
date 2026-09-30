import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * CartCleared event
 *
 * Aggregate: Cart
 */
export type CartCleared = Event<
  "CartCleared",
  {
    cart_id: string;
    cleared_at: number;
  },
  EventMetadata
>;
