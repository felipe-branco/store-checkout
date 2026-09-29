import { describe, expect, it } from "vitest";
import { join } from "path";
import { loadMigrationById } from "./migration.js";
import { resolveSliceRef } from "./resolve-slice-ref.js";
import type { SliceRef } from "./types/slice-ref.js";
import { getPackageRoot } from "./resolve-slice-ref.js";

const addItemRef: SliceRef = {
  snapshotFormatVersion: "1.0.0",
  snapshot: join(getPackageRoot(), "migrations/20260701000000_tutorial.json"),
  pinnedSnapshot: "20260701000000_tutorial",
  sourceRefs: {
    boardId: "11111111-1111-4111-8111-111111111111",
    chapterId: "22222222-2222-4222-8222-222222222222",
    sliceBorderIds: ["33333333-3333-4333-8333-333333333333"],
    columnIds: ["55555555-5555-4555-8555-555555555555"],
  },
  sliceTitle: "Add item",
  sliceType: "STATE_CHANGE",
  sliceStatus: "Planned",
};

const itemListRef: SliceRef = {
  snapshotFormatVersion: "1.0.0",
  snapshot: join(getPackageRoot(), "migrations/20260701000000_tutorial.json"),
  pinnedSnapshot: "20260701000000_tutorial",
  sourceRefs: {
    boardId: "11111111-1111-4111-8111-111111111111",
    chapterId: "22222222-2222-4222-8222-222222222222",
    sliceBorderIds: ["44444444-4444-4444-8444-444444444444"],
    columnIds: ["66666666-6666-4666-8666-666666666666"],
  },
  sliceTitle: "Item list",
  sliceType: "STATE_VIEW",
  sliceStatus: "Planned",
};

describe("resolveSliceRef", () => {
  const snapshot = loadMigrationById("20260701000000_tutorial");

  it("resolves [SC] Add item", () => {
    const view = resolveSliceRef(addItemRef, snapshot, { allowMissingPrefix: true });
    expect(view.sliceType).toBe("STATE_CHANGE");
    expect(view.flows).toHaveLength(1);
    expect(view.flows[0]!.commands[0]?.title).toBe("Add Item");
    expect(view.flows[0]!.events[0]?.title).toBe("Item Added");
    expect(view.flows[0]!.scenarios.length).toBeGreaterThan(0);
  });

  it("resolves [SV] Item list", () => {
    const view = resolveSliceRef(itemListRef, snapshot, { allowMissingPrefix: true });
    expect(view.sliceType).toBe("STATE_VIEW");
    expect(view.flows).toHaveLength(1);
    expect(view.flows[0]!.readModels[0]?.title).toBe("Item list");
  });
});

describe("migrationDiff", () => {
  it("returns empty when only one migration", async () => {
    const { migrationDiff } = await import("./migration.js");
    const rows = migrationDiff(undefined, "20260701000000_tutorial");
    expect(rows).toEqual([]);
  });
});
