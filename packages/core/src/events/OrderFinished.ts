import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * OrderFinished event
 *
 * Aggregate: Cart
 */
export type OrderFinished = Event<
  "OrderFinished",
  {
    cart_id: string;
    order_id: string;
    finished_at: number;
  },
  EventMetadata
>;
