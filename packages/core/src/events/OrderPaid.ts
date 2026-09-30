import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * OrderPaid event
 *
 * Aggregate: Cart
 */
export type OrderPaid = Event<
  "OrderPaid",
  {
    cart_id: string;
    order_id: string;
    paid_at: number;
    value_paid_in_cents: number;
    currency: string;
    payment_method: string;
    status: string;
  },
  EventMetadata
>;
