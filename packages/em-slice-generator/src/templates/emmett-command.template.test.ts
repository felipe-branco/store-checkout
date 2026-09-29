import { describe, expect, it } from "vitest";
import type { Slice, Command } from "../types/codegen-slice.js";
import { generateEmmettCommandHandler } from "./emmett-command.template.js";

const fixtureSlice: Slice = {
  id: "add-item",
  title: "Add item",
  sliceType: "STATE_CHANGE",
  status: "Created",
  commands: [
    {
      id: "cmd-1",
      title: "Add Item",
      type: "COMMAND",
      aggregate: "Item",
      fields: [
        { name: "item_id", type: "UUID", idAttribute: true },
        { name: "name", type: "String" },
      ],
      dependencies: [],
      createsAggregate: false,
    },
  ],
  events: [
    {
      id: "evt-1",
      title: "Item Added",
      type: "EVENT",
      aggregate: "Item",
      context: "INTERNAL",
      fields: [
        { name: "item_id", type: "UUID", idAttribute: true },
        { name: "name", type: "String" },
      ],
      dependencies: [],
      createsAggregate: false,
    },
  ],
  specifications: [],
  readmodels: [],
  processors: [],
  screens: [],
  screenImages: [],
  tables: [],
  actors: [],
  externalEvents: [],
  aggregates: ["Item"],
};

describe("generateEmmettCommandHandler", () => {
  it("emits DeciderCommandHandler with injected PostgresEventStore and CommandResult", () => {
    const command = fixtureSlice.commands[0] as Command;
    const code = generateEmmettCommandHandler(fixtureSlice, command);

    expect(code).toContain("DeciderCommandHandler");
    expect(code).toContain('from "@store-checkout/event-store"');
    expect(code).not.toContain('@event-driven-io/emmett');
    expect(code).toContain("eventStore: PostgresEventStore");
    expect(code).toContain("Promise<CommandResult<ItemAdded>>");
    expect(code).toContain("const streamId = command.data.item_id");
    expect(code).toContain("await run(eventStore, streamId, command)");
    expect(code).toContain("return { success: true, newEvents: result.newEvents }");
    expect(code).not.toContain("createEmmettEventStoreFromEnv");
    expect(code).toContain("} catch (cause) {");
    expect(code).toContain("ItemState");
  });

  it("emits generated *_at fields with metadata.now.getTime() and documents the timestamp standard", () => {
    const sliceWithTimestamp: Slice = {
      ...fixtureSlice,
      events: [
        {
          id: "evt-2",
          title: "Item Updated",
          type: "EVENT",
          aggregate: "Item",
          context: "INTERNAL",
          fields: [
            { name: "item_id", type: "UUID", idAttribute: true },
            { name: "item_updated_at", type: "Int", generated: true },
          ],
          dependencies: [],
          createsAggregate: false,
        },
      ],
    };
    const command = sliceWithTimestamp.commands[0] as Command;
    const code = generateEmmettCommandHandler(sliceWithTimestamp, command);

    expect(code).toContain("command.metadata.now.getTime()");
    expect(code).toContain("docs/EVENT_SOURCING_BEST_PRACTICES.md");
    expect(code).toContain("// Do not use Date.now() or divide by 1000.");
    expect(code).not.toContain("item_updated_at: Date.now()");
    expect(code).not.toContain("item_updated_at: crypto.randomUUID()");
  });
});
