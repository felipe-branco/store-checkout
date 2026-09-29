#!/usr/bin/env tsx
import { writeFileSync } from "fs";
import { join } from "path";
import { checkAllDrift, checkSliceDrift } from "./drift.js";
import { migrationAdd, migrationDiff, mergeStatusIntoSnapshot } from "./migration.js";
import { resolveSliceDirArg, resolveSliceRefFromPath } from "./resolve-slice-ref.js";
import {
  bumpSliceRef,
  initSlice,
  markSliceStatus,
} from "./slice-init.js";
import type { SliceStatus } from "./constants.js";
import { SLICE_STATUS_VALUES } from "./constants.js";

function usage(): never {
  console.error(`Usage: em-manager <command> [args]

Commands:
  migration:add <export.json|.json.gz> [--slug name]
  migration:diff [--from id] [--to id]
  slice:init <SliceName|PascalDir> [--snapshot id]
  slice:init --all-planned [--snapshot id]
  slice:resolve <SliceDir> [--cache]
  slice:bump <SliceDir> [--snapshot id]
  slice:check-drift <SliceDir|--all>
  slice:mark-status <SliceDir> <Status>
  export:merge-status [--slug name]
`);
  process.exit(1);
}

function sliceRefPath(sliceDir: string): string {
  return join(resolveSliceDirArg(sliceDir), "slice.ref.json");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const cmd = args[0];
  if (!cmd) usage();

  switch (cmd) {
    case "migration:add": {
      const exportPath = args[1];
      if (!exportPath) usage();
      const slugIdx = args.indexOf("--slug");
      const slug = slugIdx >= 0 ? args[slugIdx + 1] : undefined;
      const id = migrationAdd(exportPath, slug);
      console.log(`Added migration: ${id}`);
      break;
    }
    case "migration:diff": {
      const fromIdx = args.indexOf("--from");
      const toIdx = args.indexOf("--to");
      const from = fromIdx >= 0 ? args[fromIdx + 1] : undefined;
      const to = toIdx >= 0 ? args[toIdx + 1] : undefined;
      const rows = migrationDiff(from, to);
      console.log(JSON.stringify(rows, null, 2));
      break;
    }
    case "slice:init": {
      const allPlanned = args.includes("--all-planned");
      const snapIdx = args.indexOf("--snapshot");
      const snapshotId = snapIdx >= 0 ? args[snapIdx + 1] : undefined;
      if (allPlanned) {
        const paths = initSlice("", { allPlanned: true, snapshotId });
        console.log(`Scaffolded ${paths.length} slice.ref.json file(s)`);
        paths.forEach((p) => console.log(`  ${p}`));
      } else {
        const name = args[1];
        if (!name) usage();
        const paths = initSlice(name, { snapshotId });
        paths.forEach((p) => console.log(`Created: ${p}`));
      }
      break;
    }
    case "slice:resolve": {
      const sliceDir = args[1];
      if (!sliceDir) usage();
      const resolvedDir = resolveSliceDirArg(sliceDir);
      const refPath = join(resolvedDir, "slice.ref.json");
      const view = resolveSliceRefFromPath(refPath, { allowMissingPrefix: true });
      if (args.includes("--cache")) {
        const out = join(resolvedDir, ".em-slice.resolved.json");
        writeFileSync(out, `${JSON.stringify(view, null, 2)}\n`, "utf-8");
        console.log(`Cached: ${out}`);
      } else {
        console.log(JSON.stringify(view, null, 2));
      }
      break;
    }
    case "slice:bump": {
      const sliceDir = args[1];
      if (!sliceDir) usage();
      const snapIdx = args.indexOf("--snapshot");
      const snapshotId = snapIdx >= 0 ? args[snapIdx + 1] : undefined;
      const ref = bumpSliceRef(sliceRefPath(sliceDir), snapshotId);
      console.log(`Bumped to ${ref.pinnedSnapshot}`);
      break;
    }
    case "slice:check-drift": {
      if (args[1] === "--all") {
        const issues = checkAllDrift();
        if (issues.length) {
          console.error(JSON.stringify(issues, null, 2));
          process.exit(1);
        }
        console.log("No drift detected");
      } else {
        const sliceDir = args[1];
        if (!sliceDir) usage();
        const issues = checkSliceDrift(sliceRefPath(sliceDir));
        if (issues.length) {
          console.error(JSON.stringify(issues, null, 2));
          process.exit(1);
        }
        console.log("No drift detected");
      }
      break;
    }
    case "slice:mark-status": {
      const sliceDir = args[1];
      const status = args[2] as SliceStatus | undefined;
      if (!sliceDir || !status) usage();
      if (!(SLICE_STATUS_VALUES as readonly string[]).includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }
      markSliceStatus(sliceRefPath(sliceDir), status);
      console.log(`Marked ${sliceDir} as ${status}`);
      break;
    }
    case "export:merge-status": {
      const slugIdx = args.indexOf("--slug");
      const slug = slugIdx >= 0 ? args[slugIdx + 1] : undefined;
      const out = mergeStatusIntoSnapshot(slug);
      console.log(`Wrote status sync migration: ${out}`);
      break;
    }
    default:
      usage();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
