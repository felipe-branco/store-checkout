#!/usr/bin/env node

import { existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { resolveSliceDir } from "@em-slices/em-manager";
import { generateFromResolvedView, getSlicesOutputDir } from "./generator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, "../../..");
const SLICE_REF_FILENAME = "slice.ref.json";

function resolveSliceDirPath(sliceDirArg: string): string {
  return sliceDirArg.startsWith("/") ? sliceDirArg : resolve(PROJECT_ROOT, sliceDirArg);
}

function assertSliceRefExists(sliceDir: string): void {
  const refPath = join(sliceDir, SLICE_REF_FILENAME);
  if (!existsSync(refPath)) {
    throw new Error(
      `Missing ${SLICE_REF_FILENAME} in ${sliceDir}. Run em:slice:init first.`
    );
  }
}

function runGenerate(sliceDirArg: string, overwrite: boolean): void {
  const sliceDir = resolveSliceDirPath(sliceDirArg);
  assertSliceRefExists(sliceDir);

  console.log(`Resolving slice ref: ${join(sliceDir, SLICE_REF_FILENAME)}`);
  const resolved = resolveSliceDir(sliceDir, { allowMissingPrefix: true });

  console.log(`\nGenerating slice: ${resolved.title} (${resolved.sliceType})`);
  console.log(`Output directory: ${getSlicesOutputDir()}\n`);

  generateFromResolvedView(resolved, sliceDir, overwrite);

  console.log(`\n✓ Successfully generated slice: ${resolved.title}`);
}

function runImplement(sliceDirArg: string, overwrite: boolean): void {
  const sliceDir = resolveSliceDirPath(sliceDirArg);
  assertSliceRefExists(sliceDir);

  const resolved = resolveSliceDir(sliceDir, { allowMissingPrefix: true });
  const sliceType = resolved.sliceType;

  console.log(`Generating slice: ${resolved.title} (${sliceType})\n`);
  runGenerate(sliceDirArg, overwrite);

  const planPath = `packages/em-slice-generator/${sliceType}_POST_GENERATION_PLAN.md`;
  const checklistPath = "packages/em-slice-generator/POST_GENERATION_CHECKLIST.md";

  console.log(`
═══════════════════════════════════════════════════════════════
  Slice generated. Agent: implement following the plan below.
═══════════════════════════════════════════════════════════════

Read and execute each step in:
  ${planPath}

Also complete the integration checklist:
  ${checklistPath}

Summary for agent:
  1. Open ${planPath}
  2. Follow all steps in order (decide, evolve, tests, registration, routes, etc.)
  3. Complete POST_GENERATION_CHECKLIST.md items for ${sliceType}
  4. Verify: pnpm exec tsc --noEmit --project packages/slices/tsconfig.json
  5. Run tests: pnpm --filter @em-slices/slices exec vitest run

`);
}

function printUsage(): void {
  console.error(`Usage:
  em-slice-generate em:slice:generate <slice-dir> [--overwrite]
  em-slice-generate em:slice:implement <slice-dir> [--overwrite]

Examples:
  em-slice-generate em:slice:generate packages/slices/src/AddItem
  em-slice-generate em:slice:implement packages/slices/src/AddItem --overwrite
`);
}

function main(): void {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const command = args[0];
  const sliceDirArg = args[1];
  const overwrite = args.includes("--overwrite");

  if (!command || !sliceDirArg) {
    printUsage();
    process.exit(1);
  }

  try {
    switch (command) {
      case "em:slice:generate":
      case "generate":
        runGenerate(sliceDirArg, overwrite);
        break;
      case "em:slice:implement":
      case "implement":
        runImplement(sliceDirArg, overwrite);
        break;
      default:
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
