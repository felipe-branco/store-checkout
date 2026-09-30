import { pongoSingleStreamProjection } from "@store-checkout/event-store";
import type { ReadEvent, PostgresReadEventMetadata, PongoDb } from "@store-checkout/event-store";
import type {
  OrderCreated,
  OrderPaid,
  OrderFinished,
  OrderPaymentFailed,
} from "@store-checkout/core";

type OrderFinishedDetailsEvent =
  | OrderCreated
  | OrderPaid
  | OrderFinished
  | OrderPaymentFailed;

/**
 * OrderFinishedDetails read model
 *
 * Aggregate: Cart
 * Context: INTERNAL
 */
export type OrderFinishedDetailsReadModel = {
  cart_id: string;
  order_id: string;
  finished_at: number | null;
  paid_at: number | null;
  items: {
    stock_id: string;
    item_id: string;
    price_in_cents: number;
    quantity: number;
  }[];
  total_in_cents: number;
  value_paid_in_cents: number | null;
};

export const evolve = (
  document: OrderFinishedDetailsReadModel | null,
  event: ReadEvent<OrderFinishedDetailsEvent, PostgresReadEventMetadata>
): OrderFinishedDetailsReadModel | null => {
  switch (event.type) {
    case "OrderCreated": {
      return {
        cart_id: event.data.cart_id,
        order_id: event.data.order_id,
        finished_at: null,
        paid_at: null,
        items: event.data.items,
        total_in_cents: event.data.total_in_cents,
        value_paid_in_cents: null,
      };
    }
    case "OrderPaid": {
      if (!document || document.order_id !== event.data.order_id) {
        return {
          cart_id: event.data.cart_id,
          order_id: event.data.order_id,
          finished_at: null,
          paid_at: event.data.paid_at,
          items: [],
          total_in_cents: event.data.value_paid_in_cents,
          value_paid_in_cents: event.data.value_paid_in_cents,
        };
      }
      return {
        ...document,
        paid_at: event.data.paid_at,
        value_paid_in_cents: event.data.value_paid_in_cents,
      };
    }
    case "OrderFinished": {
      if (!document || document.order_id !== event.data.order_id) {
        return {
          cart_id: event.data.cart_id,
          order_id: event.data.order_id,
          finished_at: event.data.finished_at,
          paid_at: null,
          items: [],
          total_in_cents: 0,
          value_paid_in_cents: null,
        };
      }
      return {
        ...document,
        finished_at: event.data.finished_at,
      };
    }
    case "OrderPaymentFailed": {
      return null;
    }
    default:
      return document;
  }
};

const collectionName = "orderfinisheddetails-collection";

export const OrderFinishedDetailsProjection = pongoSingleStreamProjection({
  canHandle: ["OrderCreated", "OrderPaid", "OrderFinished", "OrderPaymentFailed"],
  collectionName,
  evolve,
});

export const getOrderFinishedDetailsById = (
  db: PongoDb,
  streamId: string
): Promise<OrderFinishedDetailsReadModel | null> => {
  return db.collection<OrderFinishedDetailsReadModel>(collectionName).findOne({ _id: streamId });
};
