import type { Slice, Command } from "../types/codegen-slice.js";
import { toPascalCase, toEventName } from "../utils/naming.js";
import { mapFieldType, isTimestampField } from "../utils/type-mapping.js";

/**
 * Generate command handler using emmett's Decider pattern:
 *   decide(command, state) → events[]
 *   evolve(state, event)  → state
 *   initialState
 *
 * The handler wrapper (handleXxx) loads state from the event store,
 * calls decide, and appends new events.
 *
 * Validation is NOT done here — it lives in routes.ts via Zod.
 */
export function generateCommandHandler(slice: Slice, command: Command): string {
  const commandName = toPascalCase(command.title);
  const aggregateName = command.aggregate;
  const aggregateIdField = `${aggregateName.charAt(0).toLowerCase() + aggregateName.slice(1)}Id`;
  const event = slice.events[0];
  const aggregateIdFieldName =
    event?.fields.find((f) => f.idAttribute)?.name ??
    event?.fields.find((f) => f.name === `${aggregateName.charAt(0).toLowerCase() + aggregateName.slice(1)}_id`)?.name ??
    aggregateIdField;

  // Events produced by this command
  const eventName = event ? toEventName(event.title, event.context) : null;
  const eventImport = eventName
    ? `import type { ${eventName}, CommandResult } from "@store-checkout/core";`
    : `import type { CommandResult } from "@store-checkout/core";`;
  const eventUnion = eventName || "Event";

  // All events for the aggregate (for evolve)
  const allEventNames = slice.events.map((e) => toEventName(e.title, e.context));
  const allEventImports = allEventNames
    .map((name) => name)
    .filter((name, i, arr) => arr.indexOf(name) === i); // dedupe
  const aggregateEventUnion =
    allEventImports.length > 0 ? allEventImports.join(" | ") : "Event";

  // Build command data fields (aggregate ID + command.fields, dedupe aggregate ID)
  const commandDataFields = [
    `    ${aggregateIdFieldName}: string;`,
    ...command.fields
      .filter((f) => f.name !== aggregateIdFieldName)
      .map(
      (field) =>
        `    ${field.name}${field.optional ? "?" : ""}: ${mapFieldType(field)};`
    ),
  ].join("\n");

  // Build event construction (mapping command fields → event fields)
  const eventDataLines = event
    ? event.fields
        .map((field) => {
          if (field.idAttribute || field.name === aggregateIdFieldName) {
            return `      ${field.name}: data.${aggregateIdFieldName},`;
          }
          if (field.generated && isTimestampField(field.name)) {
            return `      ${field.name}: metadata.now.getTime(), // Unix ms — docs/EVENT_SOURCING_BEST_PRACTICES.md`;
          }
          if (field.generated) {
            return `      ${field.name}: randomUUID(), // generated`;
          }
          // Direct mapping from command data
          return `      ${field.name}: data.${field.name},`;
        })
        .join("\n")
    : "      // TODO: Add event data fields";

  // Build specification comments (business rules from slice.json)
  const specComments = slice.specifications
    .flatMap((spec) => spec.comments.map((c) => c.description))
    .filter(Boolean);
  const specBlock =
    specComments.length > 0
      ? specComments.map((c) => ` * - ${c}`).join("\n")
      : " * (no specifications defined — check slice.json)";

  // Build spec block (# Spec Start / # Spec End) when specifications exist — enabled by default
  const hasSpecs = slice.specifications && slice.specifications.length > 0;
  const specBlockFormatted = hasSpecs
    ? slice.specifications
        .map(
          (spec) =>
            `# Spec Start\nTitle: ${spec.title}\n### Given (Events): ${spec.given?.map((g) => g.title).join(", ") ?? "—"}\n### When (Command): ${spec.when?.[0]?.title ?? "—"}\n### Then: ${spec.then?.[0]?.title ?? "—"}\n# Spec End`
        )
        .join("\n\n")
    : "";

  // Check if randomUUID is needed (for generated non-timestamp, non-ID fields)
  const needsRandomUUID = event?.fields.some(
    (f) => f.generated && !isTimestampField(f.name) && !f.idAttribute
  );

  return `${needsRandomUUID ? `import { randomUUID } from "crypto";\n` : ""}import {
  DeciderCommandHandler,
  type PostgresEventStore,
} from "@store-checkout/event-store";
${eventImport}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Aggregate state for ${aggregateName} */
export type ${aggregateName}State = {
  /** Whether the aggregate has been initialised */
  exists: boolean;
};

export const initialState = (): ${aggregateName}State => ({ exists: false });

/** ${commandName} command (emmett Command shape) */
export type ${commandName}Command = {
  type: "${commandName}";
  data: {
${commandDataFields}
  };
  metadata: {
    now: Date;
    correlation_id?: string;
    causation_id?: string;
  };
};

// ---------------------------------------------------------------------------
// Decider — pure functions, no I/O
// ---------------------------------------------------------------------------

${specBlockFormatted ? `/*\n * ${specBlockFormatted.split("\n").join("\n * ")}\n */\n` : ""}
/**
 * Decide which events to emit for the given command and current state.
 *
 * Timestamp standard: new *_at / *_time instant fields use Unix milliseconds
 * from metadata.now.getTime(). Do not divide by 1000. See docs/EVENT_SOURCING_BEST_PRACTICES.md.
 *
 * Business rules (from specifications):
${specBlock}
 */
export function decide(
  command: ${commandName}Command,
  _state: ${aggregateName}State
): ${eventUnion}[] {
  const { data, metadata } = command;
  const streamId = data.${aggregateIdFieldName};

  // TODO: Add business-rule validations using _state
  // Example: if (_state.exists) throw new Error("${aggregateName} already exists");

${eventName
    ? `  const event: ${eventName} = {
    type: "${eventName}",
    data: {
${eventDataLines}
    },
    metadata: {
      now: metadata.now,
      correlation_id: metadata.correlation_id,
      causation_id: metadata.causation_id ?? streamId,
      streamName: streamId,
    },
  };

  return [event];`
    : `  // TODO: Create and return domain events
  void data;
  void metadata;
  return [];`}
}

/**
 * Evolve aggregate state by applying an event.
 */
export function evolve(
  state: ${aggregateName}State,
  event: ${aggregateEventUnion}
): ${aggregateName}State {
  switch (event.type) {
${allEventNames
    .map(
      (name) => `    case "${name}":
      return { ...state, exists: true };`
    )
    .join("\n")}
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Handler — event store integration
// ---------------------------------------------------------------------------

const run = DeciderCommandHandler({
  evolve: (state, event) => evolve(state, event as ${aggregateEventUnion}),
  initialState,
  decide,
});

function commandErrorCode(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (
    message.includes("not exist") ||
    message.includes("not found") ||
    message.includes("does not exist") ||
    message.includes("StreamNotFound") ||
    message.includes("Concurrency") ||
    message.includes("ExpectedStreamVersion")
  ) {
    return message.includes("Concurrency") || message.includes("ExpectedStreamVersion")
      ? "STREAM_APPEND_FAILED"
      : "INVALID_STATE";
  }
  return "BUSINESS_RULE_VIOLATION";
}

export async function handle${commandName}(
  command: ${commandName}Command,
  eventStore: PostgresEventStore
): Promise<CommandResult<${eventUnion}>> {
  const streamId = command.data.${aggregateIdFieldName};
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
`;
}
