import type { Slice, Command } from "../types/codegen-slice.js";
import { toPascalCase, toEventName } from "../utils/naming.js";
import { mapFieldType, isTimestampField } from "../utils/type-mapping.js";

/**
 * Emmett CommandHandler template for new EM-generated STATE_CHANGE slices.
 */
export function generateEmmettCommandHandler(slice: Slice, command: Command): string {
  const commandName = toPascalCase(command.title);
  const aggregateName = command.aggregate || inferAggregate(command);
  const aggregateIdField =
    command.fields.find((f) => f.idAttribute)?.name ??
    command.fields.find((f) => f.name.endsWith("_id"))?.name ??
    `${aggregateName.charAt(0).toLowerCase()}${aggregateName.slice(1)}_id`;

  const event = slice.events[0];
  const eventName = event ? toEventName(event.title, event.context) : null;

  const allEventNames = slice.events.map((e) => toEventName(e.title, e.context));
  const aggregateEventUnion =
    allEventNames.length > 0 ? allEventNames.join(" | ") : "Event";

  const commandDataFields = [
    `    ${aggregateIdField}: string;`,
    ...command.fields
      .filter((f) => f.name !== aggregateIdField)
      .map(
        (field) =>
          `    ${field.name}${field.optional ? "?" : ""}: ${mapFieldType(field)};`
      ),
  ].join("\n");

  const eventDataLines = event
    ? event.fields
        .map((field) => {
          if (field.idAttribute || field.name === aggregateIdField) {
            return `      ${field.name}: command.data.${aggregateIdField},`;
          }
          if (field.generated && isTimestampField(field.name)) {
            return `      ${field.name}: command.metadata.now.getTime(), // Unix ms — docs/EVENT_SOURCING_BEST_PRACTICES.md`;
          }
          if (field.generated) {
            return `      ${field.name}: crypto.randomUUID(),`;
          }
          return `      ${field.name}: command.data.${field.name},`;
        })
        .join("\n")
    : "";

  const aiTodoSpecs = slice.specifications
    .map(
      (spec) =>
        `// AI-TODO Spec Start\n// Title: ${spec.title}\n// Given: ${spec.given.map((g) => g.title).join(", ")}\n// When: ${spec.when[0]?.title ?? "—"}\n// Then: ${spec.then[0]?.title ?? spec.comments[0]?.description ?? "—"}\n// AI-TODO Spec End`
    )
    .join("\n\n");

  const needsCrypto = event?.fields.some(
    (f) => f.generated && !isTimestampField(f.name) && !f.idAttribute
  );

  return `import {
  DeciderCommandHandler,
  type Command,
  type PostgresEventStore,
} from "@store-checkout/event-store";
import type { CommandResult, ${eventName ?? "Event"} } from "@store-checkout/core";
${needsCrypto ? `import { randomUUID as cryptoRandomUUID } from "crypto";\nconst crypto = { randomUUID: cryptoRandomUUID };\n` : ""}

export type ${aggregateName}State = {
  exists: boolean;
};

export const ${aggregateName}InitialState: ${aggregateName}State = { exists: false };

export const initialState = (): ${aggregateName}State => ${aggregateName}InitialState;

export type ${commandName}Command = Command<
  "${commandName}",
  {
${commandDataFields}
  }
>;

${aiTodoSpecs}

export function evolve(
  state: ${aggregateName}State,
  event: ${aggregateEventUnion}
): ${aggregateName}State {
  switch (event.type) {
${allEventNames.map((name) => `    case "${name}":\n      return { ...state, exists: true };`).join("\n")}
    default:
      return state;
  }
}

export function decide(
  command: ${commandName}Command,
  state: ${aggregateName}State
): ${aggregateEventUnion}[] {
  // Timestamp standard: new *_at / *_time fields → command.metadata.now.getTime() (Unix ms).
  // Do not use Date.now() or divide by 1000. See docs/EVENT_SOURCING_BEST_PRACTICES.md.
  // AI-TODO: implement business rules from specifications
  void state;
  void command;
${eventName
    ? `  return [
    {
      type: "${eventName}",
      data: {
${eventDataLines}
      },
    } as ${eventName},
  ];`
    : "  return [];"}
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

export async function handle${commandName}(
  command: ${commandName}Command,
  eventStore: PostgresEventStore
): Promise<CommandResult<${eventName ?? "Event"}>> {
  const streamId = command.data.${aggregateIdField};
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

function inferAggregate(command: Command): string {
  const idField = command.fields.find((f) => f.name.endsWith("_id"));
  if (idField) {
    const base = idField.name.slice(0, -3);
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  return toPascalCase(command.title.split(" ").pop() ?? "Aggregate");
}
