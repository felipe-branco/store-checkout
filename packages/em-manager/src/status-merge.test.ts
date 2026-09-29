import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { mergeStatusIntoSnapshot, loadMigrationById } from "./migration.js";
import { getPackageRoot } from "./resolve-slice-ref.js";

const repoRoot = join(getPackageRoot(), "../..");
const fixtureDir = join(repoRoot, "packages/slices/src/_StatusMergeFixture");
const refPath = join(fixtureDir, "slice.ref.json");

describe("mergeStatusIntoSnapshot", () => {
  beforeAll(() => {
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(
      refPath,
      JSON.stringify(
        {
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
          sliceStatus: "Done",
        },
        null,
        2
      ),
      "utf-8"
    );
  });

  afterAll(() => {
    if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true, force: true });
  });

  it("patches sliceStatus on slice borders from slice.ref.json files", () => {
    const out = mergeStatusIntoSnapshot("test_status_sync_fixture");
    const snap = loadMigrationById(out);
    const boardId = Object.keys(snap.metadata)[0]!;
    const border = snap.metadata[boardId]?.["33333333-3333-4333-8333-333333333333"] as {
      meta?: { sliceStatus?: string };
    };
    expect(border?.meta?.sliceStatus).toBe("Done");
    const outPath = join(getPackageRoot(), "migrations", `${out}.json`);
    if (existsSync(outPath)) unlinkSync(outPath);
  });
});
