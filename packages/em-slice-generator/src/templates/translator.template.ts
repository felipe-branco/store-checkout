import type { Slice, Processor } from "../types/codegen-slice.js";
import { toPascalCase, toEventName } from "../utils/naming.js";

/**
 * Generate translator handler code
 *
 * A translator receives an external event/message, maps it to an internal
 * format, and triggers an internal command (Anti-Corruption Layer pattern).
 */
export function generateTranslatorHandler(slice: Slice, processor: Processor): string {
  const translatorName = toPascalCase(processor.title);

  // External events (INBOUND dependencies of type EVENT)
  // INBOUND event dependencies in a TRANSLATOR are always external, so prefix with "External"
  const inboundEvents = processor.dependencies
    .filter((dep) => dep.type === "INBOUND" && dep.elementType === "EVENT")
    .map((dep) => toEventName(dep.title, "EXTERNAL"));

  // Also check the slice-level events with EXTERNAL context
  const externalSliceEvents = slice.events
    .filter((e) => e.context === "EXTERNAL")
    .map((e) => toEventName(e.title, e.context));

  const allExternalEvents = [...new Set([...inboundEvents, ...externalSliceEvents])];

  // Internal commands (OUTBOUND dependencies of type COMMAND)
  const outboundCommands = processor.dependencies
    .filter((dep) => dep.type === "OUTBOUND" && dep.elementType === "COMMAND")
    .map((dep) => toPascalCase(dep.title));

  // Also check the slice-level commands with INTERNAL context
  const internalSliceCommands = slice.commands
    .filter((c) => c.context === "INTERNAL")
    .map((c) => toPascalCase(c.title));

  const allInternalCommands = [...new Set([...outboundCommands, ...internalSliceCommands])];

  // Build imports for external events
  const externalEventImports = allExternalEvents
    .map((eventName) => `import type { ${eventName} } from "@store-checkout/core";`)
    .join("\n");

  const externalEventUnion = allExternalEvents.length > 0
    ? allExternalEvents.join(" | ")
    : "never";

  // Build field mapping comments from the external events and internal commands
  const fieldMappingComments = generateFieldMappingComments(slice, allExternalEvents, allInternalCommands);

  return `import type { SendResult, ICommandDispatcher } from "@store-checkout/core";
${externalEventImports}

/**
 * ${processor.description || `${translatorName} translator`}
 *
 * Translates external events into internal commands.
 * This is an Anti-Corruption Layer (ACL) that protects the internal domain
 * from external data formats.
 *
 * Commands are dispatched via dispatcher.sendCommand() — returns SendResult for explicit error handling.
 *
 * External events: ${allExternalEvents.length > 0 ? allExternalEvents.join(", ") : "None defined"}
 * Internal commands: ${allInternalCommands.length > 0 ? allInternalCommands.join(", ") : "None defined"}
 */

/**
 * External payload type (the raw shape received from the external system)
 *
 * TODO: Define the exact external payload structure.
 * This should match what the external system sends (e.g., webhook body).
 */
export interface ExternalPayload {
  [key: string]: unknown;
}

/**
 * Translate an external event into internal command(s)
 *
 * @param externalEvent - The external event to translate
 * @param dispatcher - Command dispatcher for sendCommand (returns SendResult)
 * @param correlationId - Optional correlation ID (e.g. webhook event id) for tracing
 * @returns SendResult
 */
export async function translate${translatorName}(
  externalEvent: ${externalEventUnion},
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<SendResult> {
  // This translator is triggered by external events:
  // ${allExternalEvents.length > 0 ? allExternalEvents.map(e => `- ${e}`).join("\n  // ") : "- No external events defined"}
  //
  // It should produce internal commands:
  // ${allInternalCommands.length > 0 ? allInternalCommands.map(c => `- ${c}`).join("\n  // ") : "- No internal commands defined"}

  // TODO: Implement translation logic
${fieldMappingComments}
  // Example:
  // const internalCommand = {
  //   type: "InternalCommandName",
  //   data: {
  //     aggregateId: randomUUID(),
  //     // Map external fields to internal fields
  //   },
  //   metadata: {
  //     now: new Date(),
  //     correlation_id: correlationId,
  //     causation_id: aggregateId,
  //   },
  // };
  // return dispatcher.sendCommand(internalCommand, correlationId);

  // Suppress unused parameter warnings until implementation
  void externalEvent;
  void dispatcher;
  void correlationId;
}

/**
 * Translate a raw external payload into the typed external event
 *
 * Use this when receiving webhooks or raw messages from external systems.
 *
 * @param payload - Raw external payload (e.g., webhook body)
 * @returns The typed external event
 */
export function parseExternalPayload(
  payload: ExternalPayload
): ${externalEventUnion} {
  // TODO: Validate and map the raw payload to the typed external event
  // Example:
  // return {
  //   type: "ExternalEventName",
  //   data: {
  //     // Map raw payload fields
  //   },
  //   metadata: {},
  // };

  throw new Error("parseExternalPayload not implemented — map raw payload to typed event");

  // Suppress unused parameter warning
  void payload;
}
`;
}

/**
 * Generate field mapping comments by comparing external event fields
 * with internal command fields
 */
function generateFieldMappingComments(
  slice: Slice,
  externalEventNames: string[],
  internalCommandNames: string[]
): string {
  const lines: string[] = [];

  // Find external events with fields
  const externalEvents = slice.events.filter(
    (e) => externalEventNames.includes(toEventName(e.title, e.context)) && e.fields.length > 0
  );

  // Find internal commands with fields
  const internalCommands = slice.commands.filter(
    (c) => internalCommandNames.includes(toPascalCase(c.title)) && c.fields.length > 0
  );

  if (externalEvents.length > 0 && internalCommands.length > 0) {
    lines.push("  // Field mapping reference:");

    for (const event of externalEvents) {
      lines.push(`  // External event "${event.title}" fields:`);
      for (const field of event.fields) {
        lines.push(`  //   - ${field.name}: ${field.type}${field.optional ? " (optional)" : ""}`);
      }
    }

    lines.push("  //");

    for (const command of internalCommands) {
      lines.push(`  // Internal command "${command.title}" fields:`);
      for (const field of command.fields) {
        lines.push(`  //   - ${field.name}: ${field.type}${field.optional ? " (optional)" : ""}`);
      }
    }

    lines.push("  //");
  }

  return lines.length > 0 ? lines.join("\n") + "\n" : "";
}

