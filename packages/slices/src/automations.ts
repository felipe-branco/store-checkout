import type { MessageBus } from "@store-checkout/event-store";

export type AutomationContext = Record<string, never>;

export function registerAllAutomations(
  _messageBus: MessageBus,
  _context: AutomationContext
): void {
  // Register slice automations here after code generation.
}
