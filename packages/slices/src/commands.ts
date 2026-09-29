import type { MessageBus, EventStore } from "@em-slices/event-store";
import type { ICommandDispatcher } from "@em-slices/core";

export function registerAllCommandHandlers(
  _dispatcher: ICommandDispatcher,
  _messageBus: MessageBus,
  _eventStore: EventStore
): void {
  // Register slice command handlers here after code generation.
}
