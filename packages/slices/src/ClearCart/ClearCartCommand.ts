import {
  DeciderCommandHandler,
  type Command,
  type PostgresEventStore,
} from "@store-checkout/event-store";
import type {
  CartCreated,
  CartCleared,
  CommandMetadata,
  CommandResult,
  ItemAddedToCart,
  ItemRemovedFromCart,
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

export type ClearCartCommand = Command<
  "ClearCart",
  {
    cart_id: string;
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
  command: ClearCartCommand,
  state: CartState
): CartCleared[] {
  if (!state.exists) {
    throw new Error("Cart does not exist");
  }

  const streamId = command.data.cart_id;
  return [
    {
      type: "CartCleared",
      data: {
        cart_id: command.data.cart_id,
        cleared_at: command.metadata!.now.getTime(),
      },
      metadata: {
        now: command.metadata!.now,
        streamName: streamId,
        causation_id: command.metadata?.causation_id ?? streamId,
        ...(command.metadata?.correlation_id
          ? { correlation_id: command.metadata.correlation_id }
          : {}),
      },
    } as CartCleared,
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

export async function handleClearCart(
  command: ClearCartCommand,
  eventStore: PostgresEventStore
): Promise<CommandResult<CartCleared>> {
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
