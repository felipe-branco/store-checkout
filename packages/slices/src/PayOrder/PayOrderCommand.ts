import {
  DeciderCommandHandler,
  type Command,
  type PostgresEventStore,
} from "@store-checkout/event-store";
import type { CommandMetadata, CommandResult, OrderPaid } from "@store-checkout/core";
import {
  evolve,
  initialState,
  type CartOrderState,
} from "../CreateOrder/CreateOrderCommand";

export type PayOrderCommand = Command<
  "PayOrder",
  {
    cart_id: string;
    order_id: string;
    value_paid_in_cents: number;
    currency: string;
    payment_method: string;
    status: string;
  },
  CommandMetadata
>;

export function decide(command: PayOrderCommand, state: CartOrderState): OrderPaid[] {
  const { cart_id, order_id } = command.data;
  const phase = state.orderPhaseById[order_id];

  if (phase === "paid" || phase === "finished") {
    return [];
  }

  if (phase !== "created" && phase !== "failed") {
    return [];
  }

  return [
    {
      type: "OrderPaid",
      data: {
        cart_id,
        order_id,
        paid_at: command.metadata!.now.getTime(),
        value_paid_in_cents: command.data.value_paid_in_cents,
        currency: command.data.currency,
        payment_method: command.data.payment_method,
        status: command.data.status,
      },
      metadata: {
        now: command.metadata!.now,
        streamName: cart_id,
        causation_id: command.metadata?.causation_id ?? cart_id,
        ...(command.metadata?.correlation_id
          ? { correlation_id: command.metadata.correlation_id }
          : {}),
      },
    } as OrderPaid,
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

export async function handlePayOrder(
  command: PayOrderCommand,
  eventStore: PostgresEventStore
): Promise<CommandResult<OrderPaid>> {
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
