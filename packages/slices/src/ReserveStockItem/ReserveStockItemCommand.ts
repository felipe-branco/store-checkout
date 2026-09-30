import {
  DeciderCommandHandler,
  type Command,
  type PostgresEventStore,
} from "@store-checkout/event-store";
import type {
  CommandResult,
  StockItemDereserved,
  StockItemReserved,
  StockItemSold,
} from "@store-checkout/core";

type StockStreamEvent = StockItemReserved | StockItemDereserved | StockItemSold;

export type StockState = {
  exists: boolean;
  reservedByItem: Record<string, number>;
  soldByItem: Record<string, number>;
  reservedByCartItem: Record<string, number>;
  soldDedupKeys: Record<string, true>;
};

export const initialState = (): StockState => ({
  exists: false,
  reservedByItem: {},
  soldByItem: {},
  reservedByCartItem: {},
  soldDedupKeys: {},
});

function cartItemKey(cartId: string, itemId: string): string {
  return `${cartId}:${itemId}`;
}

function sellDedupKey(orderId: string, itemId: string): string {
  return `${orderId}:${itemId}`;
}

export function evolve(state: StockState, event: StockStreamEvent): StockState {
  switch (event.type) {
    case "StockItemReserved": {
      const { item_id, cart_id, quantity } = event.data;
      const ciKey = cartItemKey(cart_id, item_id);
      return {
        ...state,
        exists: true,
        reservedByItem: {
          ...state.reservedByItem,
          [item_id]: (state.reservedByItem[item_id] ?? 0) + quantity,
        },
        reservedByCartItem: {
          ...state.reservedByCartItem,
          [ciKey]: (state.reservedByCartItem[ciKey] ?? 0) + quantity,
        },
      };
    }
    case "StockItemDereserved": {
      const { item_id, cart_id, quantity } = event.data;
      const ciKey = cartItemKey(cart_id, item_id);
      return {
        ...state,
        exists: true,
        reservedByItem: {
          ...state.reservedByItem,
          [item_id]: (state.reservedByItem[item_id] ?? 0) - quantity,
        },
        reservedByCartItem: {
          ...state.reservedByCartItem,
          [ciKey]: (state.reservedByCartItem[ciKey] ?? 0) - quantity,
        },
      };
    }
    case "StockItemSold": {
      const { item_id, order_id, quantity } = event.data;
      const dedup = sellDedupKey(order_id, item_id);
      return {
        ...state,
        exists: true,
        soldByItem: {
          ...state.soldByItem,
          [item_id]: (state.soldByItem[item_id] ?? 0) + quantity,
        },
        soldDedupKeys: { ...state.soldDedupKeys, [dedup]: true },
      };
    }
    default:
      return state;
  }
}

export type ReserveStockItemCommand = Command<
  "ReserveStockItem",
  {
    stock_id: string;
    cart_id: string;
    item_id: string;
    quantity: number;
    /** Initial on-hand count from static catalog (EM Stock Products List). */
    on_hand_quantity: number;
  }
>;

export function decide(
  command: ReserveStockItemCommand,
  state: StockState
): StockItemReserved[] {
  const { stock_id, cart_id, item_id, quantity, on_hand_quantity } = command.data;

  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }

  const reserved = state.reservedByItem[item_id] ?? 0;
  const sold = state.soldByItem[item_id] ?? 0;
  const available = on_hand_quantity - reserved - sold;

  if (quantity > available) {
    if (available <= 0) {
      throw new Error("Out of stock error");
    }
    throw new Error("Not enough stock error");
  }

  return [
    {
      type: "StockItemReserved",
      data: {
        stock_id,
        cart_id,
        item_id,
        quantity,
        reserved_at: command.metadata!.now.getTime(),
      },
    } as StockItemReserved,
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

export async function handleReserveStockItem(
  command: ReserveStockItemCommand,
  eventStore: PostgresEventStore
): Promise<CommandResult<StockItemReserved>> {
  const streamId = command.data.stock_id;
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
