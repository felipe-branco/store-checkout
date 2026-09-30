import type { PostgresEventStore } from "@store-checkout/event-store";
import type { SendResult } from "@store-checkout/core";

export type OrderPaidAutomatorContext = {
  sendCommand: (
    command: { type: string; data: Record<string, unknown>; metadata?: Record<string, unknown> },
    correlationId?: string
  ) => Promise<SendResult>;
  eventStore: PostgresEventStore;
};

export type SoldItemsOrderAutomatorContext = OrderPaidAutomatorContext;
