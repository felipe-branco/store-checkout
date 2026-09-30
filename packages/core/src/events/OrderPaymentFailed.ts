import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * OrderPaymentFailed event
 *
 * Aggregate: Cart
 */
export type OrderPaymentFailed = Event<
  "OrderPaymentFailed",
  {
    cart_id: string;
    order_id: string;
    failed_at: number;
    currency: string;
    payment_method: string;
    status: string;
  },
  EventMetadata
>;
