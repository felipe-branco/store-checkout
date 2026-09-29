import type { Slice, ReadModel } from "../types/codegen-slice.js";
import { toPascalCase, toEventName, toKebabCase } from "../utils/naming.js";

/**
 * Generate projection test file
 *
 * Projections are tested using emmett's PostgreSQLProjectionSpec which requires
 * a live PostgreSQL database. The generated file provides a compilable scaffold
 * with a pure-function unit test for the evolve logic and integration tests.
 */
export function generateProjectionTestFile(slice: Slice, readModel: ReadModel): string {
  const projectionName = toPascalCase(slice.title);
  const readModelName = toPascalCase(readModel.title);
  const collectionName = `${toKebabCase(readModelName)}-collection`;

  // Build event imports
  const eventNames = slice.events.map((e) => toEventName(e.title, e.context));
  const eventImports = eventNames
    .map((name) => `import type { ${name} } from "@em-slices/core";`)
    .join("\n");

  const firstEvent = slice.events[0];
  const firstEventName = firstEvent ? toEventName(firstEvent.title, firstEvent.context) : "TODO";

  // Get aggregate ID field name (first field with idAttribute, or default)
  const aggregateIdField = firstEvent?.fields.find(f => f.idAttribute)?.name || "id";

  // Build example event data from the first event's fields
  const exampleEventData = firstEvent
    ? firstEvent.fields
        .map((f) => {
          if (f.idAttribute) return `        ${f.name}: "test-stream-123",`;
          if (f.generated && (f.type === "DateTime" || f.name.endsWith("At"))) return `        ${f.name}: Date.now(),`;
          if (f.example) {
            // For Date type, use the example string directly (YYYY-MM-DD format)
            if (f.type === "Date") return `        ${f.name}: "${f.example}",`;
            return `        ${f.name}: ${formatExample(String(f.example), f.type)},`;
          }
          return `        ${f.name}: /* TODO */,`;
        })
        .join("\n")
    : "        // TODO: event data";

  // Build event data for integration test
  const integrationEventData = firstEvent
    ? firstEvent.fields
        .map((f) => {
          if (f.idAttribute) return `          ${f.name}: streamId,`;
          if (f.generated && (f.type === "DateTime" || f.name.endsWith("At"))) return `          ${f.name}: now.getTime(),`;
          if (f.example) {
            // For Date type, use the example string directly (YYYY-MM-DD format)
            if (f.type === "Date") return `          ${f.name}: "${f.example}",`;
            return `          ${f.name}: ${formatExample(String(f.example), f.type)},`;
          }
          return `          ${f.name}: /* TODO */,`;
        })
        .join("\n")
    : "          // TODO: event data";

  // Build expected read model data for integration test
  // Match the actual event data being created in the test
  const integrationExpectedData = readModel.fields
    .map((f) => {
      // Find corresponding event field to get the actual value being used
      const eventField = firstEvent?.fields.find(ef => ef.name === f.name);
      if (f.idAttribute || eventField?.idAttribute) return `          ${f.name}: streamId,`;
      if (f.generated && (f.type === "DateTime" || f.name.endsWith("At"))) return `          ${f.name}: now.getTime(),`;
      if (eventField?.generated && (eventField.type === "DateTime" || eventField.name.endsWith("At"))) return `          ${f.name}: now.getTime(),`;
      // Use the same value from integrationEventData if available
      if (eventField) {
        if (eventField.example) {
          // For Date type, use the example string directly (YYYY-MM-DD format)
          if (f.type === "Date" || eventField.type === "Date") return `          ${f.name}: "${eventField.example}",`;
          // For phone numbers, remove + prefix if present (database may strip it)
          if (f.name.toLowerCase().includes("phone") && typeof eventField.example === "string" && eventField.example.startsWith("+")) {
            return `          ${f.name}: "${eventField.example.slice(1)}",`;
          }
          return `          ${f.name}: ${formatExample(String(eventField.example), f.type)},`;
        }
      }
      if (f.example) {
        // For Date type, use the example string directly (YYYY-MM-DD format)
        if (f.type === "Date") return `          ${f.name}: "${f.example}",`;
        // For phone numbers, remove + prefix if present (database may strip it)
        if (f.name.toLowerCase().includes("phone") && typeof f.example === "string" && f.example.startsWith("+")) {
          return `          ${f.name}: "${f.example.slice(1)}",`;
        }
        return `          ${f.name}: ${formatExample(String(f.example), f.type)},`;
      }
      return `          ${f.name}: /* TODO */,`;
    })
    .join("\n");

  // Get query function name (use listElement to determine if it's a list view)
  const hasGetAll = readModel.listElement || false;
  const queryFunctionName = hasGetAll ? `getAll${readModelName}` : `get${readModelName}ById`;
  const queryFunctionImport = hasGetAll
    ? `, getAll${readModelName}, get${readModelName}ById`
    : `, get${readModelName}ById`;

  // Find a field to test in query results (prefer name/title fields, fallback to first field)
  const testFieldName = readModel.fields.find(f =>
    f.name.toLowerCase().includes("name") ||
    f.name.toLowerCase().includes("title")
  )?.name || readModel.fields[0]?.name || "id";

  return `import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
${eventImports}
import type { ReadEvent, PostgresReadEventMetadata } from "@em-slices/event-store";
import { evolve${queryFunctionImport}, type ${readModelName}ReadModel } from "./${projectionName}Projection";
import { setupTestDatabase, cleanupTestDatabase } from "../../test-utils/test-database";
import { expectProjectionDocument${hasGetAll ? `, expectProjectionDocuments` : ""} } from "../../test-utils/helpers";

// ---------------------------------------------------------------------------
// Unit tests for the evolve logic (pure function, no database needed)
// ---------------------------------------------------------------------------

describe("${projectionName} Projection", () => {
  const make${firstEventName}Event = (
    overrides: Partial<${firstEventName}["data"]> = {}
  ): ReadEvent<${firstEventName}, PostgresReadEventMetadata> =>
    ({
      type: "${firstEventName}",
      data: {
${exampleEventData}
        ...overrides,
      },
      metadata: { streamName: "test-stream-123" },
    }) as unknown as ReadEvent<${firstEventName}, PostgresReadEventMetadata>;

  describe("evolve", () => {
    it("should project ${firstEventName} into ${readModelName}ReadModel", () => {
      const event = make${firstEventName}Event();
      const result = evolve(null, event);

      expect(result).not.toBeNull();
${readModel.fields.map(f => {
  if (f.idAttribute) return `      expect(result!.${f.name}).toBe("test-stream-123");`;
  if (f.generated && (f.type === "DateTime" || f.name.endsWith("At"))) return `      expect(result!.${f.name}).toEqual(expect.any(Number));`;
  if (f.example) {
    if (f.type === "Date") return `      expect(result!.${f.name}).toBe("${f.example}");`;
    const example = formatExample(String(f.example), f.type);
    // For phone numbers, remove + prefix if present in example (database may strip it)
    if (f.name.toLowerCase().includes("phone") && typeof f.example === "string" && f.example.startsWith("+")) {
      return `      expect(result!.${f.name}).toBe("${f.example.slice(1)}");`;
    }
    return `      expect(result!.${f.name}).toBe(${example});`;
  }
  return `      expect(result!.${f.name}).toBeDefined();`;
}).join("\n")}
    });

${readModel.fields.filter(f => f.optional).length > 0 ? `    it("should handle ${firstEventName} with optional fields missing", () => {
      const event = make${firstEventName}Event({
${readModel.fields.filter(f => f.optional).map(f => `        ${f.name}: undefined,`).join("\n")}
      });
      const result = evolve(null, event);

      expect(result).not.toBeNull();
${readModel.fields.filter(f => f.optional).map(f => `      expect(result!.${f.name}).toBeUndefined();`).join("\n")}
    });` : ""}

    it("should return null for unknown event types", () => {
      const unknownEvent = {
        type: "UnknownEvent",
        data: {},
        metadata: {},
      } as unknown as ReadEvent<${firstEventName}, PostgresReadEventMetadata>;

      const result = evolve(null, unknownEvent);
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests — verify projections are built from events in database
  // ---------------------------------------------------------------------------

  describe("Integration Tests", () => {
    let testDb: Awaited<ReturnType<typeof setupTestDatabase>> | undefined;

    beforeAll(async () => {
      try {
        console.log("Setting up test database for projection tests...");
        console.log("Note: This requires Docker to be running. If this times out, ensure Docker is running.");
        testDb = await setupTestDatabase();
        console.log("Test database setup complete:", testDb.connectionString);
      } catch (error) {
        console.error("Failed to set up test database:", error);
        console.error("Make sure Docker is running and accessible");
        throw error;
      }
    }, 60000); // 60 second timeout for testcontainers

    afterAll(async () => {
      // if (testDb) {
      //   await cleanupTestDatabase(testDb);
      // }
    });

    it("should project ${firstEventName} event into read model in database", async () => {
      if (!testDb) {
        throw new Error("Test database not initialized");
      }

      const streamId = randomUUID();
      const now = new Date();
      const event: ${firstEventName} = {
        type: "${firstEventName}",
        data: {
${integrationEventData}
        },
        metadata: {},
      };

      await testDb!.eventStore.appendToStream(streamId, [event], {
        expectedStreamVersion: "STREAM_DOES_NOT_EXIST",
      });

      // Wait a bit for projection to process (emmett auto-processes)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify document exists in Pongo collection
      await expectProjectionDocument<${readModelName}ReadModel>(
        testDb.pongoDb,
        "${collectionName}",
        streamId,
        {
${integrationExpectedData}
        }
      );

      // Verify query functions work correctly
      ${hasGetAll ? `
      const allItems = await ${queryFunctionName}(testDb.pongoDb);
      expect(allItems.length).toBeGreaterThanOrEqual(1);
      const foundItem = allItems.find(item => item.${aggregateIdField} === streamId);
      expect(foundItem).toBeDefined();
      expect(foundItem!.${testFieldName}).toBeDefined();
      ` : `
      const itemById = await get${readModelName}ById(testDb.pongoDb, streamId);
      expect(itemById).not.toBeNull();
      expect(itemById!.${aggregateIdField}).toBe(streamId);
      `}
    });
  });
});
`;
}

function formatExample(example: string, type: string): string {
  // Date type is handled separately in the template (uses example string directly as YYYY-MM-DD)
  if (type === "DateTime") {
    return `"${example}"`;
  }
  if (type === "Int" || type === "Long" || type === "Double" || type === "Decimal") {
    return example;
  }
  if (type === "Boolean") {
    return example;
  }
  return `"${example}"`;
}
