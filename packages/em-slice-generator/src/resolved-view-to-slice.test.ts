import { describe, expect, it } from "vitest";
import { loadMigrationById } from "@em-slices/em-manager";
import { resolveSliceRef } from "@em-slices/em-manager";
import { resolvedViewToSlice } from "./resolved-view-to-slice.js";

const addItemRef = {
  snapshotFormatVersion: "1.0.0",
  snapshot: "",
  pinnedSnapshot: "20260701000000_tutorial",
  sourceRefs: {
    boardId: "11111111-1111-4111-8111-111111111111",
    chapterId: "22222222-2222-4222-8222-222222222222",
    sliceBorderIds: ["33333333-3333-4333-8333-333333333333"],
    columnIds: ["55555555-5555-4555-8555-555555555555"],
  },
  sliceTitle: "Add item",
  sliceType: "STATE_CHANGE" as const,
  sliceStatus: "Planned" as const,
};

describe("resolvedViewToSlice", () => {
  it("converts Add item view to legacy Slice", () => {
    const snapshot = loadMigrationById("20260701000000_tutorial");
    const view = resolveSliceRef(addItemRef, snapshot, { allowMissingPrefix: true });
    const slice = resolvedViewToSlice(view);
    expect(slice.sliceType).toBe("STATE_CHANGE");
    expect(slice.commands[0]?.title).toBe("Add Item");
    expect(slice.specifications.length).toBeGreaterThan(0);
  });
});
