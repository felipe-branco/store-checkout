import type { Event } from "@store-checkout/event-store";
import type { EventMetadata } from "../eventMetadata";

export type ExternalPaymentLineItem = {
  stock_id: string;
  item_id: string;
  price_in_cents: number;
  quantity: number;
};

/**
 * Simulated payment provider webhook payload (External Payment Simulator).
 */
export type ExternalPaymentSimulatorPayload = Event<
  "ExternalPaymentSimulatorPayload",
  {
    external_id: string;
    cart_id: string;
    order_id: string;
    items: ExternalPaymentLineItem[];
    value_paid: number;
    currency: string;
    payment_method: string;
    status: "success" | "fail";
  },
  EventMetadata
>;
