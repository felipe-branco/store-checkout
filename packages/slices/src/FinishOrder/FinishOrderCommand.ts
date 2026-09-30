import {
  DeciderCommandHandler,
  type Command,
  type PostgresEventStore,
} from "@store-checkout/event-store";
import type { CommandMetadata, CommandResult, OrderFinished } from "@store-checkout/core";
import {
  evolve,
  initialState,
  type CartOrderState,
} from "../CreateOrder/CreateOrderCommand";

export type FinishOrderCommand = Command<
  "FinishOrder",
  {
    cart_id: string;
    order_id: string;
  },
  CommandMetadata
>;

export function decide(
  command: FinishOrderCommand,
  state: CartOrderState
): OrderFinished[] {
  const { cart_id, order_id } = command.data;
  const phase = state.orderPhaseById[order_id];

  if (phase === "finished") {
    return [];
  }

  if (phase !== "paid") {
    return [];
  }

  return [
    {
      type: "OrderFinished",
      data: {
        cart_id,
        order_id,
        finished_at: command.metadata!.now.getTime(),
      },
      metadata: {
        now: command.metadata!.now,
        streamName: cart_id,
        causation_id: command.metadata?.causation_id ?? cart_id,
        ...(command.metadata?.correlation_id
          ? { correlation_id: command.metadata.correlation_id }
          : {}),
      },
    } as OrderFinished,
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

export async function handleFinishOrder(
  command: FinishOrderCommand,
  eventStore: PostgresEventStore
): Promise<CommandResult<OrderFinished>> {
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
