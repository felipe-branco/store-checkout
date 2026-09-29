import "server-only";

import type {
  MessageBus,
  SendResult,
  CommandResult,
  CommandFailure,
  ICommandDispatcher,
} from "@em-slices/core";
import type { Event } from "@em-slices/event-store";

type CommandHandler<C> = (
  command: C
) => Promise<CommandResult<Event>>;

/**
 * Command dispatcher that returns SendResult instead of throwing.
 * Used by webhooks and other callers that need explicit result handling.
 */
export class CommandDispatcher implements ICommandDispatcher {
  private handlers = new Map<string, CommandHandler<unknown>>();
  private messageBus: MessageBus;

  constructor(messageBus: MessageBus) {
    this.messageBus = messageBus;
  }

  register<C extends { type: string }>(
    commandType: C["type"],
    handler: CommandHandler<C>
  ): void {
    this.handlers.set(commandType, handler as CommandHandler<unknown>);
  }

  async sendCommand(
    command: { type: string },
    correlationId?: string
  ): Promise<SendResult> {
    const commandType = command.type;
    const handler = this.handlers.get(commandType);
    if (!handler) {
      return {
        success: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `No handler registered for command type: ${commandType}`,
          commandType,
          correlationId,
        },
      };
    }

    const result = (await handler(command)) as CommandResult<Event>;

    if (result.success) {
      for (const event of result.newEvents) {
        await this.messageBus.publish(event);
      }
      return { success: true };
    }

    const error: CommandFailure["error"] = {
      ...result.error,
      ...(correlationId && { correlationId }),
    };
    return { success: false, error };
  }
}
