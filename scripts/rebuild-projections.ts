#!/usr/bin/env tsx
/**
 * Rebuild projections from event store.
 *
 * Uses manual rebuild engine (reads events, applies evolve, writes to Pongo).
 * Bypasses rebuildPostgreSQLProjections which fails to persist writes.
 *
 * Usage:
 *   pnpm rebuild:projections                    # List available projections
 *   pnpm rebuild:projections ItemList ...   # Rebuild specific projections
 *   pnpm rebuild:projections --all              # Rebuild all projections
 *
 * Requires DATABASE_URL environment variable.
 */

import { MANUAL_REBUILD_CONFIG } from "./manual-rebuild-config";
import { runManualRebuild } from "./manual-rebuild-engine";

const args = process.argv.slice(2).filter((a) => a !== "--");
const all = args.includes("--all");
const names = args.filter((a) => a !== "--all");

if (names.length === 0 && !all) {
  console.log("Available projections:", Object.keys(MANUAL_REBUILD_CONFIG).join(", "));
  console.log("Usage: pnpm rebuild:projections [projection1] [projection2] ... | --all");
  process.exit(0);
}

const configNames = all ? Object.keys(MANUAL_REBUILD_CONFIG) : names;
for (const n of configNames) {
  if (!MANUAL_REBUILD_CONFIG[n]) {
    console.error(`Unknown projection: ${n}`);
    process.exit(1);
  }
}

const configs = configNames.map((n) => MANUAL_REBUILD_CONFIG[n]!);

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  console.log("Rebuilding projections:", all ? "all" : names.join(", "));
  const results = await runManualRebuild(connectionString, configs);
  for (const r of results) {
    console.log(`  ${r.projection}: ${r.processed} events, ${r.documents} documents`);
  }
  console.log("Rebuild complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
