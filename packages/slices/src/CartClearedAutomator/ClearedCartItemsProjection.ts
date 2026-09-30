import { pongoSingleStreamProjection } from "@store-checkout/event-store";
import type { ReadEvent, PostgresReadEventMetadata, PongoDb } from "@store-checkout/event-store";
import type {
  CartCreated,
  ItemAddedToCart,
  ItemRemovedFromCart,
  CartCleared,
} from "@store-checkout/core";

type ClearedCartItemsEvent =
  | CartCreated
  | ItemAddedToCart
  | ItemRemovedFromCart
  | CartCleared;

export type ClearedCartLineDetail = {
  item_id: string;
  stock_id: string;
  price_in_cents: number;
  quantity: number;
};

/**
 * Cleared Cart Items read model (EM)
 *
 * Aggregate: Cart
 */
export type ClearedCartItemsReadModel = {
  cart_id: string;
  items: { item_id: string; quantity: number }[];
  created_at: number;
  cleared_at: number | null;
  clearedLines: ClearedCartLineDetail[];
};

type ClearedCartItemsDocument = ClearedCartItemsReadModel;

function mergeLine(
  lines: ClearedCartLineDetail[],
  item_id: string,
  stock_id: string,
  price_in_cents: number,
  delta: number
): ClearedCartLineDetail[] {
  const next = [...lines];
  const index = next.findIndex((line) => line.item_id === item_id);
  if (index === -1) {
    if (delta > 0) {
      next.push({ item_id, stock_id, price_in_cents, quantity: delta });
    }
    return next;
  }
  const line = next[index]!;
  const quantity = line.quantity + delta;
  if (quantity <= 0) {
    next.splice(index, 1);
  } else {
    next[index] = { ...line, stock_id, price_in_cents, quantity };
  }
  return next;
}

function toEmItems(lines: ClearedCartLineDetail[]): ClearedCartItemsReadModel["items"] {
  return lines.map(({ item_id, quantity }) => ({ item_id, quantity }));
}

export const evolve = (
  document: ClearedCartItemsDocument | null,
  event: ReadEvent<ClearedCartItemsEvent, PostgresReadEventMetadata>
): ClearedCartItemsDocument | null => {
  switch (event.type) {
    case "CartCreated": {
      return {
        cart_id: event.data.cart_id,
        items: [],
        created_at: event.data.created_at,
        cleared_at: null,
        clearedLines: [],
      };
    }
    case "ItemAddedToCart": {
      const base: ClearedCartItemsDocument =
        document ?? {
          cart_id: event.data.cart_id,
          items: [],
          created_at: event.data.added_at,
          cleared_at: null,
          clearedLines: [],
        };
      const clearedLines = mergeLine(
        base.clearedLines,
        event.data.item_id,
        event.data.stock_id,
        event.data.price_in_cents,
        event.data.quantity
      );
      return {
        ...base,
        clearedLines,
        items: toEmItems(clearedLines),
      };
    }
    case "ItemRemovedFromCart": {
      if (!document) {
        return null;
      }
      const clearedLines = mergeLine(
        document.clearedLines,
        event.data.item_id,
        event.data.stock_id,
        event.data.price_in_cents,
        -event.data.quantity
      );
      return {
        ...document,
        clearedLines,
        items: toEmItems(clearedLines),
      };
    }
    case "CartCleared": {
      if (!document) {
        return {
          cart_id: event.data.cart_id,
          items: [],
          created_at: event.data.cleared_at,
          cleared_at: event.data.cleared_at,
          clearedLines: [],
        };
      }
      return {
        ...document,
        items: toEmItems(document.clearedLines),
        cleared_at: event.data.cleared_at,
      };
    }
    default:
      return document;
  }
};

const collectionName = "clearedcartitems-collection";

export const ClearedCartItemsProjection = pongoSingleStreamProjection({
  canHandle: ["CartCreated", "ItemAddedToCart", "ItemRemovedFromCart", "CartCleared"],
  collectionName,
  evolve,
});

export const getClearedCartItemsById = (
  db: PongoDb,
  streamId: string
): Promise<ClearedCartItemsReadModel | null> => {
  return db.collection<ClearedCartItemsReadModel>(collectionName).findOne({ _id: streamId });
};
