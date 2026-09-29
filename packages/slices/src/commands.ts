import type { MessageBus, EventStore } from "@store-checkout/event-store";
import type { ICommandDispatcher } from "@store-checkout/core";

export function registerAllCommandHandlers(
  _dispatcher: ICommandDispatcher,
  _messageBus: MessageBus,
  _eventStore: EventStore
): void {
  // Register slice command handlers here after code generation.
}
