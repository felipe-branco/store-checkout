import {
  DeciderCommandHandler,
  type Command,
  type PostgresEventStore,
} from "@store-checkout/event-store";
import type {
  CartCreated,
  CommandMetadata,
  CommandResult,
  ItemAddedToCart,
  ItemRemovedFromCart,
  CartCleared,
} from "@store-checkout/core";

type CartStreamEvent =
  | CartCreated
  | ItemAddedToCart
  | ItemRemovedFromCart
  | CartCleared;

export type CartState = {
  exists: boolean;
  itemsByItemId: Record<string, number>;
};

export const CartInitialState: CartState = { exists: false, itemsByItemId: {} };

export const initialState = (): CartState => CartInitialState;

export type AddItemToCartCommand = Command<
  "AddItemToCart",
  {
    cart_id: string;
    stock_id: string;
    item_id: string;
    price_in_cents: number;
    quantity: number;
  },
  CommandMetadata
>;

export function evolve(state: CartState, event: CartStreamEvent): CartState {
  switch (event.type) {
    case "CartCreated":
      return { exists: true, itemsByItemId: {} };
    case "ItemAddedToCart": {
      const { item_id, quantity } = event.data;
      return {
        ...state,
        exists: true,
        itemsByItemId: {
          ...state.itemsByItemId,
          [item_id]: (state.itemsByItemId[item_id] ?? 0) + quantity,
        },
      };
    }
    case "ItemRemovedFromCart": {
      const { item_id, quantity } = event.data;
      const current = state.itemsByItemId[item_id] ?? 0;
      const nextQty = current - quantity;
      const itemsByItemId = { ...state.itemsByItemId };
      if (nextQty <= 0) {
        delete itemsByItemId[item_id];
      } else {
        itemsByItemId[item_id] = nextQty;
      }
      return { ...state, itemsByItemId };
    }
    case "CartCleared":
      return { ...state, itemsByItemId: {} };
    default:
      return state;
  }
}

export function decide(
  command: AddItemToCartCommand,
  state: CartState
): ItemAddedToCart[] {
  if (!state.exists) {
    throw new Error("Cart does not exist");
  }

  const { cart_id, stock_id, item_id, price_in_cents, quantity } = command.data;
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }
  if (price_in_cents < 0) {
    throw new Error("Price must not be negative");
  }

  return [
    {
      type: "ItemAddedToCart",
      data: {
        cart_id,
        stock_id,
        item_id,
        price_in_cents,
        quantity,
        added_at: command.metadata!.now.getTime(),
      },
      metadata: {
        now: command.metadata!.now,
        streamName: cart_id,
        causation_id: command.metadata?.causation_id ?? cart_id,
        ...(command.metadata?.correlation_id
          ? { correlation_id: command.metadata.correlation_id }
          : {}),
      },
    } as ItemAddedToCart,
  ];
}

const run = DeciderCommandHandler({
  evolve,
  initialState,
  decide,
});

function commandErrorCode(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (
    message.includes("not exist") ||
    message.includes("not found") ||
    message.includes("does not exist")
  ) {
    return "INVALID_STATE";
  }
  return "BUSINESS_RULE_VIOLATION";
}

export async function handleAddItemToCart(
  command: AddItemToCartCommand,
  eventStore: PostgresEventStore
): Promise<CommandResult<ItemAddedToCart>> {
  const streamId = command.data.cart_id;
  try {
    const result = await run(eventStore, streamId, command);
    return { success: true, newEvents: result.newEvents };
  } catch (cause) {
    return {
      success: false,
      error: {
        code: commandErrorCode(cause),
        message: cause instanceof Error ? cause.message : String(cause),
        commandType: command.type,
        streamId,
        cause,
      },
    };
  }
}
