import { pongoSingleStreamProjection } from "@store-checkout/event-store";
import type { ReadEvent, PostgresReadEventMetadata, PongoDb } from "@store-checkout/event-store";
import type {
  OrderCreated,
  OrderPaymentFailed,
  OrderPaid,
  OrderFinished,
} from "@store-checkout/core";

type PaymentFailedOrderEvent =
  | OrderCreated
  | OrderPaymentFailed
  | OrderPaid
  | OrderFinished;

type PendingOrder = {
  order_id: string;
  items: PaymentFailedOrderReadModel["items"];
  total_in_cents: number;
};

/**
 * PaymentFailedOrder read model
 *
 * Aggregate: Cart
 * Context: INTERNAL
 */
export type PaymentFailedOrderReadModel = {
  cart_id: string;
  order_id: string;
  items: {
    stock_id: string;
    item_id: string;
    price_in_cents: number;
    quantity: number;
  }[];
  total_in_cents: number;
};

type PaymentFailedOrderDocument = PaymentFailedOrderReadModel | PendingOrder | null;

function isFailedReadModel(
  doc: PaymentFailedOrderDocument
): doc is PaymentFailedOrderReadModel {
  return doc !== null && "cart_id" in doc;
}

export const evolve = (
  document: PaymentFailedOrderDocument,
  event: ReadEvent<PaymentFailedOrderEvent, PostgresReadEventMetadata>
): PaymentFailedOrderDocument => {
  switch (event.type) {
    case "OrderCreated": {
      return {
        order_id: event.data.order_id,
        items: event.data.items,
        total_in_cents: event.data.total_in_cents,
      };
    }
    case "OrderPaymentFailed": {
      const pending = isFailedReadModel(document) ? null : document;
      if (!pending || pending.order_id !== event.data.order_id) {
        return {
          cart_id: event.data.cart_id,
          order_id: event.data.order_id,
          items: [],
          total_in_cents: 0,
        };
      }
      return {
        cart_id: event.data.cart_id,
        order_id: event.data.order_id,
        items: pending.items,
        total_in_cents: pending.total_in_cents,
      };
    }
    case "OrderPaid":
    case "OrderFinished": {
      return null;
    }
    default:
      return document;
  }
};

const collectionName = "paymentfailedorder-collection";

export const PaymentFailedOrderProjection = pongoSingleStreamProjection({
  canHandle: ["OrderCreated", "OrderPaymentFailed", "OrderPaid", "OrderFinished"],
  collectionName,
  evolve,
});

export const getPaymentFailedOrderById = (
  db: PongoDb,
  streamId: string
): Promise<PaymentFailedOrderReadModel | null> => {
  return db.collection<PaymentFailedOrderReadModel>(collectionName).findOne({ _id: streamId });
};
