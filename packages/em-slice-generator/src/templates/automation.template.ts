import type { Slice, Processor } from "../types/codegen-slice.js";
import { toPascalCase } from "../utils/naming.js";

/**
 * Generate automation processor handler code
 */
export function generateAutomationHandler(_slice: Slice, processor: Processor): string {
  const processorName = toPascalCase(processor.title);
  const aggregateName = processor.aggregate;

  // Get events that trigger this automation (from dependencies or triggers field)
  const triggerEvents = processor.triggers || [];
  const dependencyEvents = processor.dependencies
    .filter((dep) => dep.elementType === "EVENT")
    .map((dep) => toPascalCase(dep.title));

  const allTriggerEvents = [...new Set([...triggerEvents, ...dependencyEvents])];
  const eventImports = allTriggerEvents
    .map((eventName) => `import type { ${eventName} } from "@store-checkout/core";`)
    .join("\n");
  const eventUnionType = allTriggerEvents.length > 0
    ? allTriggerEvents.join(" | ")
    : "never";

  return `import type { MessageBus } from "@store-checkout/core";
${eventImports}

/**
 * ${processor.description || `${processorName} automation processor`}
 *
 * Aggregate: ${aggregateName}
 * Context: ${processor.context || "INTERNAL"}
 *
 * Triggers: ${allTriggerEvents.length > 0 ? allTriggerEvents.join(", ") : "None defined"}
 *
 * Commands are dispatched via messageBus.send() — command handlers are
 * registered centrally in commands.ts (decide → append → publish).
 */
export async function handle${processorName}Automation(
  event: ${eventUnionType},
  messageBus: MessageBus
): Promise<void> {
  // This processor is triggered when one of the following events occur:
  // ${allTriggerEvents.length > 0 ? allTriggerEvents.map(e => `- ${e}`).join("\n  // ") : "- No triggers defined"}

  // TODO: Implement automation logic
  // Build a command and send it via the message bus:
  // Example:
  // const command = {
  //   type: "CommandName",
  //   data: { /* map event fields to command fields */ },
  //   metadata: { now: new Date() },
  // };
  // await messageBus.send(command);

  // Suppress unused parameter warnings until implementation
  void event;
  void messageBus;
}
`;
}
