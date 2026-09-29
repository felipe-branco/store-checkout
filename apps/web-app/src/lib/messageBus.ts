import {
  getInMemoryMessageBus,
  type MessageBus,
  type EventSubscription,
  type CommandProcessor,
} from "@store-checkout/event-store";
import { registerAllCommandHandlers } from "@store-checkout/slices/src/commands";
import { registerAllAutomations } from "@store-checkout/slices/src/automations";
import { getEventStore, getPongoDb } from "./eventStore";
import { CommandDispatcher } from "./commandDispatcher";

let messageBusInstance: (MessageBus & CommandProcessor & EventSubscription) | null = null;
let commandDispatcherInstance: CommandDispatcher | null = null;
let initializationPromise: Promise<void> | null = null;
let initializationError: Error | null = null;

export async function initializeMessageBus(): Promise<void> {
  if (messageBusInstance) return;
  if (initializationError) throw initializationError;
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  initializationPromise = (async () => {
    try {
      const eventStore = getEventStore();
      const messageBus = getInMemoryMessageBus();
      const dispatcher = new CommandDispatcher(messageBus);

      registerAllCommandHandlers(dispatcher, messageBus, eventStore);
      registerAllAutomations(messageBus, {});

      messageBusInstance = messageBus;
      commandDispatcherInstance = dispatcher;
    } catch (error) {
      const initError =
        error instanceof Error ? error : new Error("Failed to initialize message bus");
      initializationError = initError;
      console.error("Error initializing message bus:", initError.message);
      throw initError;
    }
  })();

  await initializationPromise;
}

export function getMessageBus(): MessageBus & CommandProcessor & EventSubscription {
  if (!messageBusInstance) {
    throw new Error("Message bus not initialized. Call initializeMessageBus() first.");
  }
  return messageBusInstance;
}

export function getCommandDispatcher(): CommandDispatcher {
  if (!commandDispatcherInstance) {
    throw new Error("Command dispatcher not initialized. Call initializeMessageBus() first.");
  }
  return commandDispatcherInstance;
}

export function getInitializationError(): Error | null {
  return initializationError;
}

export { getPongoDb };
