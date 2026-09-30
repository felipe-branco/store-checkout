import { pongoSingleStreamProjection } from "@store-checkout/event-store";
import type { ReadEvent, PostgresReadEventMetadata, PongoDb } from "@store-checkout/event-store";
import type {
  CartCreated,
  ItemAddedToCart,
  ItemRemovedFromCart,
  CartCleared,
} from "@store-checkout/core";

type CartProjectionEvent =
  | CartCreated
  | ItemAddedToCart
  | ItemRemovedFromCart
  | CartCleared;

/**
 * CartDetails read model
 *
 * Aggregate: Cart
 * Context: INTERNAL
 */
export type CartDetailsReadModel = {
  cart_id: string;
  items: {
    item_id: string;
    quantity: number;
  }[];
  created_at: number;
};

function mergeItemQuantity(
  items: CartDetailsReadModel["items"],
  item_id: string,
  delta: number
): CartDetailsReadModel["items"] {
  const next = [...items];
  const index = next.findIndex((line) => line.item_id === item_id);
  if (index === -1) {
    if (delta > 0) {
      next.push({ item_id, quantity: delta });
    }
    return next;
  }
  const newQty = next[index]!.quantity + delta;
  if (newQty <= 0) {
    next.splice(index, 1);
  } else {
    next[index] = { item_id, quantity: newQty };
  }
  return next;
}

export const evolve = (
  document: CartDetailsReadModel | null,
  event: ReadEvent<CartProjectionEvent, PostgresReadEventMetadata>
): CartDetailsReadModel | null => {
  switch (event.type) {
    case "CartCreated": {
      return {
        cart_id: event.data.cart_id,
        items: [],
        created_at: event.data.created_at,
      };
    }
    case "ItemAddedToCart": {
      const base: CartDetailsReadModel =
        document ?? {
          cart_id: event.data.cart_id,
          items: [],
          created_at: event.data.added_at,
        };
      return {
        ...base,
        items: mergeItemQuantity(base.items, event.data.item_id, event.data.quantity),
      };
    }
    case "ItemRemovedFromCart": {
      if (!document) {
        return {
          cart_id: event.data.cart_id,
          items: [],
          created_at: event.data.removed_at,
        };
      }
      return {
        ...document,
        items: mergeItemQuantity(document.items, event.data.item_id, -event.data.quantity),
      };
    }
    case "CartCleared": {
      if (!document) {
        return {
          cart_id: event.data.cart_id,
          items: [],
          created_at: event.data.cleared_at,
        };
      }
      return { ...document, items: [] };
    }
    default:
      return document;
  }
};

const collectionName = "cartdetails-collection";

export const CartDetailsProjection = pongoSingleStreamProjection({
  canHandle: ["CartCreated", "ItemAddedToCart", "ItemRemovedFromCart", "CartCleared"],
  collectionName,
  evolve,
});

export const getCartDetailsById = (
  db: PongoDb,
  streamId: string
): Promise<CartDetailsReadModel | null> => {
  return db.collection<CartDetailsReadModel>(collectionName).findOne({ _id: streamId });
};
