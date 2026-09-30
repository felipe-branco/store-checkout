import {
  DeciderCommandHandler,
  type Command,
  type PostgresEventStore,
} from "@store-checkout/event-store";
import type {
  CommandMetadata,
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

export type SellStockItemCommand = Command<
  "SellStockItem",
  {
    stock_id: string;
    cart_id: string;
    order_id: string;
    item_id: string;
    quantity: number;
  },
  CommandMetadata
>;

export function decide(
  command: SellStockItemCommand,
  state: StockState
): StockItemSold[] {
  const { stock_id, cart_id, order_id, item_id, quantity } = command.data;

  if (quantity <= 0) {
    return [];
  }

  if (state.soldDedupKeys[sellDedupKey(order_id, item_id)] === true) {
    return [];
  }

  return [
    {
      type: "StockItemSold",
      data: {
        stock_id,
        cart_id,
        order_id,
        item_id,
        quantity,
        sold_at: command.metadata!.now.getTime(),
      },
      metadata: {
        now: command.metadata!.now,
        streamName: stock_id,
        causation_id: command.metadata?.causation_id ?? stock_id,
        ...(command.metadata?.correlation_id
          ? { correlation_id: command.metadata.correlation_id }
          : {}),
      },
    } as StockItemSold,
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

export async function handleSellStockItem(
  command: SellStockItemCommand,
  eventStore: PostgresEventStore
): Promise<CommandResult<StockItemSold>> {
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
