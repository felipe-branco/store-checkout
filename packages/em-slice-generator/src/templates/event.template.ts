import type { Event } from "../types/codegen-slice.js";
import { toEventName } from "../utils/naming.js";
import { mapFieldType } from "../utils/type-mapping.js";

/**
 * Generate event type definition
 *
 * Uses emmett's Event<Type, Data, Metadata> type.
 * Fields ending with "At" are typed as `number` (Unix timestamp).
 */
export function generateEventType(event: Event): string {
  const eventName = toEventName(event.title, event.context);

  // Generate event data type
  const eventDataFields =
    event.fields.length > 0
      ? event.fields
          .map(
            (field) =>
              `    ${field.name}${field.optional ? "?" : ""}: ${mapFieldType(field)};`
          )
          .join("\n")
      : "    // No additional fields";

  return `import type { Event } from "@em-slices/event-store";
import type { EventMetadata } from "../eventMetadata";

/**
 * ${event.description || `${eventName} event`}
 *
 * Aggregate: ${event.aggregate}
 */
export type ${eventName} = Event<
  "${eventName}",
  {
${eventDataFields}
  },
  EventMetadata
>;
`;
}
