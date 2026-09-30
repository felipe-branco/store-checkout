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
  OrderCreated,
  OrderFinished,
  OrderPaid,
  OrderPaymentFailed,
} from "@store-checkout/core";

type CartStreamEvent =
  | CartCreated
  | ItemAddedToCart
  | ItemRemovedFromCart
  | CartCleared
  | OrderCreated
  | OrderPaid
  | OrderPaymentFailed
  | OrderFinished;

export type OrderLineItem = OrderCreated["data"]["items"][number];

export type OrderPhase = "created" | "paid" | "failed" | "finished";

export type CartOrderState = {
  exists: boolean;
  itemsByItemId: Record<string, number>;
  orderPhaseById: Record<string, OrderPhase>;
};

export const CartOrderInitialState: CartOrderState = {
  exists: false,
  itemsByItemId: {},
  orderPhaseById: {},
};

export const initialState = (): CartOrderState => CartOrderInitialState;

export type CreateOrderCommand = Command<
  "CreateOrder",
  {
    cart_id: string;
    order_id: string;
    items: OrderLineItem[];
    total_in_cents: number;
  },
  CommandMetadata
>;

function mergeItemQuantity(
  itemsByItemId: Record<string, number>,
  item_id: string,
  delta: number
): Record<string, number> {
  const next = { ...itemsByItemId };
  const current = next[item_id] ?? 0;
  const newQty = current + delta;
  if (newQty <= 0) {
    delete next[item_id];
  } else {
    next[item_id] = newQty;
  }
  return next;
}

export function evolve(state: CartOrderState, event: CartStreamEvent): CartOrderState {
  switch (event.type) {
    case "CartCreated":
      return { ...state, exists: true, itemsByItemId: {}, orderPhaseById: {} };
    case "ItemAddedToCart": {
      const { item_id, quantity } = event.data;
      return {
        ...state,
        exists: true,
        itemsByItemId: mergeItemQuantity(state.itemsByItemId, item_id, quantity),
      };
    }
    case "ItemRemovedFromCart": {
      const { item_id, quantity } = event.data;
      return {
        ...state,
        itemsByItemId: mergeItemQuantity(state.itemsByItemId, item_id, -quantity),
      };
    }
    case "CartCleared":
      return { ...state, itemsByItemId: {} };
    case "OrderCreated":
      return {
        ...state,
        orderPhaseById: {
          ...state.orderPhaseById,
          [event.data.order_id]: "created",
        },
      };
    case "OrderPaid":
      return {
        ...state,
        orderPhaseById: {
          ...state.orderPhaseById,
          [event.data.order_id]: "paid",
        },
      };
    case "OrderPaymentFailed":
      return {
        ...state,
        orderPhaseById: {
          ...state.orderPhaseById,
          [event.data.order_id]: "failed",
        },
      };
    case "OrderFinished":
      return {
        ...state,
        orderPhaseById: {
          ...state.orderPhaseById,
          [event.data.order_id]: "finished",
        },
      };
    default:
      return state;
  }
}

export function decide(
  command: CreateOrderCommand,
  state: CartOrderState
): OrderCreated[] {
  if (!state.exists) {
    throw new Error("Cart does not exist");
  }

  const { cart_id, order_id, items, total_in_cents } = command.data;

  if (state.orderPhaseById[order_id]) {
    return [];
  }

  if (items.length === 0) {
    throw new Error("Cart is empty");
  }

  if (total_in_cents < 0) {
    throw new Error("Total must not be negative");
  }

  return [
    {
      type: "OrderCreated",
      data: {
        cart_id,
        order_id,
        items,
        total_in_cents,
        ordered_at: command.metadata!.now.getTime(),
      },
      metadata: {
        now: command.metadata!.now,
        streamName: cart_id,
        causation_id: command.metadata?.causation_id ?? cart_id,
        ...(command.metadata?.correlation_id
          ? { correlation_id: command.metadata.correlation_id }
          : {}),
      },
    } as OrderCreated,
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
    message.includes("does not exist") ||
    message.includes("empty")
  ) {
    return "INVALID_STATE";
  }
  return "BUSINESS_RULE_VIOLATION";
}

export async function handleCreateOrder(
  command: CreateOrderCommand,
  eventStore: PostgresEventStore
): Promise<CommandResult<OrderCreated>> {
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
