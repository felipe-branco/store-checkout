import type { Slice, Command } from "../types/codegen-slice.js";
import { toPascalCase, toEventName } from "../utils/naming.js";
import { isTimestampField } from "../utils/type-mapping.js";

/**
 * Generate test file using emmett's DeciderSpecification pattern.
 *
 * DeciderSpecification.for({ decide, evolve, initialState })
 *   given([pastEvents]).when(command).then([expectedEvents])
 *
 * See: https://event-driven-io.github.io/emmett/getting-started.html
 */
export function generateTestFile(slice: Slice, command: Command): string {
  const sliceName = toPascalCase(slice.title);
  const commandName = toPascalCase(command.title);
  const aggregateName = command.aggregate;
  const aggregateIdField = `${aggregateName.charAt(0).toLowerCase() + aggregateName.slice(1)}Id`;
  const event = slice.events[0];
  const aggregateIdFieldName =
    event?.fields.find((f) => f.idAttribute)?.name ??
    event?.fields.find((f) => f.name === `${aggregateName.charAt(0).toLowerCase() + aggregateName.slice(1)}_id`)?.name ??
    aggregateIdField;

  // Events
  const eventName = event ? toEventName(event.title, event.context) : null;

  // Build example command data (12-space indent: inside given().when({ data: { HERE } }))
  const exampleCommandData = [
    `            ${aggregateIdFieldName}: id,`,
    ...command.fields.filter((f) => f.name !== aggregateIdFieldName).map((field) => {
      const example = field.example
        ? formatExample(field.example, field.type, field.name)
        : integrationDefaultValue(field);
      return `            ${field.name}: ${example},`;
    }),
  ].join("\n");

  // Build integration test command/event data (no TODO placeholders; use defaults when example missing)
  const integrationCommandData = [
    `        ${aggregateIdFieldName}: streamId,`,
    ...command.fields.filter((f) => f.name !== aggregateIdFieldName).map((field) => {
      const val = field.example
        ? formatExample(field.example, field.type, field.name)
        : integrationDefaultValue(field);
      return `        ${field.name}: ${val},`;
    }),
  ].join("\n");

  const integrationEventData = event
    ? event.fields
        .map((field) => {
          if (field.idAttribute || field.name === aggregateIdFieldName)
            return `          ${field.name}: streamId,`;
          if (field.generated && isTimestampField(field.name))
            return `          ${field.name}: now.getTime(),`;
          if (field.generated) return `          ${field.name}: expect.any(String),`;
          const val = field.example
            ? formatExample(field.example, field.type, field.name)
            : integrationDefaultValue(field);
          return `          ${field.name}: ${val},`;
        })
        .join("\n")
    : "          // TODO: expected event data";


  // Build example event data (12-space indent: inside .then([{ data: { HERE } }]))
  const exampleEventData = event
    ? event.fields
        .map((field) => {
          if (field.idAttribute) return `              ${field.name}: id,`;
          if (field.generated && isTimestampField(field.name))
            return `              ${field.name}: now.getTime(),`;
          if (field.generated) return `              ${field.name}: expect.any(String),`;
          const example = field.example
            ? formatExample(field.example, field.type, field.name)
            : `/* TODO */`;
          return `              ${field.name}: ${example},`;
        })
        .join("\n")
    : "              // TODO: expected event data";

  return `import { describe, it, beforeAll } from "vitest";
import { DeciderSpecification } from "@store-checkout/event-store";
import { randomUUID } from "crypto";
import { decide, evolve, initialState, handle${commandName}, type ${commandName}Command } from "./${sliceName}Command";
import type { ${eventName || "Event"} } from "@store-checkout/core";
import { CommandHandlerSpec, existingStream } from "../../test-utils/command-handler-spec";
import { expectNewEvents } from "../../test-utils/helpers";
import { setupTestDatabase } from "../../test-utils/test-database";
import { runIntegrationTests } from "../../test-utils/integration";

// ---------------------------------------------------------------------------
// DeciderSpecification wires decide + evolve + initialState together.
//
// Usage:
//   given([pastEvents])          — aggregate history
//     .when(command)             — command to handle
//     .then([expectedEvents])    — events that should be emitted
//     .thenThrows(predicate)     — or an error that should be thrown
// ---------------------------------------------------------------------------
const given = DeciderSpecification.for({
  decide,
  evolve,
  initialState,
});

describe("${commandName}", () => {
  const id = randomUUID();
  const now = new Date();

  describe("When ${aggregateName} does not exist", () => {
    it("should emit ${eventName || "event"} on valid command", () => {
      given([])
        .when({
          type: "${commandName}",
          data: {
${exampleCommandData}
          },
          metadata: { now, correlation_id: id, causation_id: id },
        })
        .then([
          {
            type: "${eventName || "TODO"}",
            data: {
${exampleEventData}
            },
            metadata: { now, causation_id: id, streamName: id },
          },
        ]);
    });
  });

  // ---------------------------------------------------------------------------
  // More test ideas (uncomment and adapt):
  // ---------------------------------------------------------------------------
  //
  // describe("When ${aggregateName} already exists", () => {
  //   it("should throw", () => {
  //     given([
  //       {
  //         type: "${eventName || "TODO"}",
  //         data: { /* past event data */ },
  //         metadata: {},
  //       },
  //     ])
  //       .when({
  //         type: "${commandName}",
  //         data: { ${aggregateIdField}: id, /* ... */ },
  //         metadata: { now },
  //       })
  //       .thenThrows(
  //         (error: Error) => error.message === "${aggregateName} already exists",
  //       );
  //   });
  // });

  // ---------------------------------------------------------------------------
  // Integration Tests — verify events are persisted to database (CI only)
  // ---------------------------------------------------------------------------
  if (runIntegrationTests) {
  describe("Integration Tests", () => {
    let testDb: Awaited<ReturnType<typeof setupTestDatabase>>;
    let given: ReturnType<typeof CommandHandlerSpec.for<${commandName}Command, ${eventName || "Event"}>>;

    beforeAll(async () => {
      testDb = await setupTestDatabase();
      given = CommandHandlerSpec.for({
        handler: handle${commandName},
        connectionString: testDb.connectionString,
      });
    }, 60000);

    it("should persist ${eventName || "event"} to database", async () => {
      const streamId = randomUUID();
      const now = new Date();
      const command: ${commandName}Command = {
        type: "${commandName}",
        data: {
${integrationCommandData}
        },
        metadata: { now },
      };

      const expectedEvent: ${eventName || "Event"} = {
        type: "${eventName || "Event"}",
        data: {
${integrationEventData}
        },
        metadata: { now, causation_id: streamId, streamName: streamId },
      };

      await given([])
        .when(command)
        .then(expectNewEvents(streamId, [expectedEvent]));
    });

    it("should do nothing when ${aggregateName.toLowerCase()} already exists (idempotent)", async () => {
      const streamId = randomUUID();
      const now = new Date();
      const pastEvent: ${eventName || "Event"} = {
        type: "${eventName || "Event"}",
        data: {
${integrationEventData}
        },
        metadata: { now, causation_id: streamId, streamName: streamId },
      };

      const command: ${commandName}Command = {
        type: "${commandName}",
        data: {
${integrationCommandData}
        },
        metadata: { now },
      };

      await given([existingStream(streamId, [pastEvent])])
        .when(command)
        .then(expectNewEvents(streamId, []));
    });
  });
  }
});
`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default values for integration tests when field.example is missing */
function integrationDefaultValue(field: { name: string; type: string }): string {
  const name = field.name.toLowerCase();
  const type = field.type;
  if (name.includes("email")) return '"test@example.com"';
  if (name.includes("auth0_id")) return '"auth0|123456789"';
  if (name.includes("auth0_role") || name.includes("role_id")) return '"rol_123456789"';
  if (name === "role") return '"admin"';
  if (name.includes("added_by") || name.includes("user_id")) return '"550e8400-e29b-41d4-a716-446655440001"';
  if (name === "state") return '"MG"';
  if (type === "Boolean") return "true";
  if (type === "UUID") return "randomUUID()";
  if (type === "String") return '"value"';
  if (type === "Int" || type === "Long" || type === "Double" || type === "Decimal") return "0";
  return '"value"';
}

function formatExample(
  example: string | object,
  type: string,
  fieldName: string
): string {
  if (isTimestampField(fieldName)) {
    return "now";
  }
  if (typeof example === "object") {
    return JSON.stringify(example);
  }
  switch (type) {
    case "String":
    case "UUID":
      // For phone numbers, remove + prefix if present (database may strip it)
      if (fieldName.toLowerCase().includes("phone") && typeof example === "string" && example.startsWith("+")) {
        return `"${example.slice(1)}"`;
      }
      return `"${example}"`;
    case "Date":
      // Date fields are strings in YYYY-MM-DD format
      return `"${example}"`;
    case "DateTime":
      return `new Date("${example}")`;
    case "Int":
    case "Long":
    case "Double":
    case "Decimal":
      return String(example);
    case "Boolean":
      return String(example);
    default:
      return `"${example}"`;
  }
}
