#!/usr/bin/env tsx
/**
 * Patch message_data for a single event in emt_messages (event store surgery).
 *
 * Does not rebuild projections — run `pnpm rebuild:projections` for affected read models.
 *
 * Usage:
 *   DATABASE_URL=... pnpm update:stream-event <stream_id> <stream_position> [options]
 *
 * Options:
 *   --message-type <type>   Verify the row matches this message_type before updating
 *   --set <path>=<value>    Set a scalar field (path uses dots, e.g. crms.0.state=MG)
 *   --set-json <path>=<json> Set a field from JSON (arrays/objects)
 *   --partition <name>      Default: emt:default
 *   --dry-run               Print before/after SQL plan; do not commit
 *
 * Examples:
 *   # Patch a field on ItemAdded (position 2)
 *   pnpm update:stream-event <stream_id> 2 \
 *     --message-type ItemAdded \
 *     --set name=Updated
 */

import { normalizePostgresUrlForPgSsl } from "@store-checkout/event-store";
import pg from "pg";

const DEFAULT_PARTITION = "emt:default";

type ScalarSet = { kind: "scalar"; path: string; value: string };
type JsonSet = { kind: "json"; path: string; value: unknown };

function usage(): never {
  console.error(
    [
      "Usage: DATABASE_URL=... pnpm update:stream-event <stream_id> <stream_position> [options]",
      "",
      "Options:",
      "  --message-type <type>    Verify message_type before updating",
      "  --set <path>=<value>     Set scalar (path: crms.0.state=MG)",
      "  --set-json <path>=<json> Set from JSON",
      "  --partition <name>       Default: emt:default",
      "  --dry-run                Preview only",
      "",
      "Example:",
      "  pnpm update:stream-event <stream_id> 2 \\",
      "    --message-type ItemAdded \\",
      "    --set name=Updated",
    ].join("\n")
  );
  process.exit(1);
}

function dotPathToPgArray(path: string): string {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) {
    throw new Error("Invalid path (empty)");
  }
  return `{${segments.join(",")}}`;
}

function parseSetArg(raw: string): ScalarSet {
  const eq = raw.indexOf("=");
  if (eq === -1) {
    throw new Error(`Invalid --set (expected path=value): ${raw}`);
  }
  const path = raw.slice(0, eq).trim();
  const value = raw.slice(eq + 1);
  if (!path) throw new Error(`Invalid --set path: ${raw}`);
  return { kind: "scalar", path, value };
}

function parseSetJsonArg(raw: string): JsonSet {
  const eq = raw.indexOf("=");
  if (eq === -1) {
    throw new Error(`Invalid --set-json (expected path=json): ${raw}`);
  }
  const path = raw.slice(0, eq).trim();
  const jsonText = raw.slice(eq + 1).trim();
  if (!path) throw new Error(`Invalid --set-json path: ${raw}`);
  let value: unknown;
  try {
    value = JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error(`Invalid JSON for --set-json ${path}: ${jsonText}`);
  }
  return { kind: "json", path, value };
}

function parseArgs(): {
  streamId: string;
  streamPosition: number;
  messageType?: string;
  partition: string;
  dryRun: boolean;
  sets: Array<ScalarSet | JsonSet>;
} {
  const argvRaw = process.argv.slice(2);
  const dryRun =
    argvRaw.includes("--dry-run") ||
    process.env.DRY_RUN === "1" ||
    process.env.DRY_RUN === "true";
  const argv = argvRaw.filter((a) => a !== "--dry-run");

  const streamId = argv[0]?.trim();
  const streamPosition = Number.parseInt(argv[1]?.trim() ?? "", 10);
  if (!streamId || !Number.isInteger(streamPosition) || streamPosition < 1) {
    usage();
  }

  let messageType: string | undefined;
  let partition = DEFAULT_PARTITION;
  const sets: Array<ScalarSet | JsonSet> = [];

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--message-type") {
      messageType = argv[++i]?.trim();
      if (!messageType) throw new Error("--message-type requires a value");
      continue;
    }
    if (arg === "--partition") {
      partition = argv[++i]?.trim() ?? "";
      if (!partition) throw new Error("--partition requires a value");
      continue;
    }
    if (arg.startsWith("--set-json=")) {
      sets.push(parseSetJsonArg(arg.slice("--set-json=".length)));
      continue;
    }
    if (arg === "--set-json") {
      const next = argv[++i];
      if (!next) throw new Error("--set-json requires path=json");
      sets.push(parseSetJsonArg(next));
      continue;
    }
    if (arg.startsWith("--set=")) {
      sets.push(parseSetArg(arg.slice("--set=".length)));
      continue;
    }
    if (arg === "--set") {
      const next = argv[++i];
      if (!next) throw new Error("--set requires path=value");
      sets.push(parseSetArg(next));
      continue;
    }
    console.error(`Unknown argument: ${arg}`);
    usage();
  }

  if (sets.length === 0) {
    console.error("At least one --set or --set-json is required.");
    usage();
  }

  return { streamId, streamPosition, messageType, partition, dryRun, sets };
}

function buildUpdateSql(
  sets: Array<ScalarSet | JsonSet>
): { sql: string; params: unknown[] } {
  let expr = "message_data";
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const set of sets) {
    const pgPath = dotPathToPgArray(set.path);
    if (set.kind === "scalar") {
      expr = `jsonb_set(${expr}, '${pgPath}', to_jsonb($${paramIndex}::text))`;
      params.push(set.value);
    } else {
      expr = `jsonb_set(${expr}, '${pgPath}', $${paramIndex}::jsonb)`;
      params.push(JSON.stringify(set.value));
    }
    paramIndex += 1;
  }

  return { sql: expr, params };
}

async function main() {
  const { streamId, streamPosition, messageType, partition, dryRun, sets } = parseArgs();

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const connectionString = normalizePostgresUrlForPgSsl(rawUrl);
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const selectParams: unknown[] = [partition, streamId, streamPosition];
    let typeFilter = "";
    if (messageType) {
      typeFilter = " AND message_type = $4";
      selectParams.push(messageType);
    }

    const { rows } = await client.query<{
      message_type: string;
      message_data: unknown;
    }>(
      `SELECT message_type, message_data
       FROM emt_messages
       WHERE partition = $1 AND is_archived = FALSE
         AND stream_id = $2 AND stream_position = $3${typeFilter}`,
      selectParams
    );

    if (rows.length === 0) {
      console.error(
        messageType
          ? `No event at stream_id=${streamId} position=${streamPosition} with message_type=${messageType}`
          : `No event at stream_id=${streamId} position=${streamPosition}`
      );
      process.exit(1);
    }

    const row = rows[0]!;
    console.log("Before:");
    console.log(JSON.stringify({ message_type: row.message_type, message_data: row.message_data }, null, 2));

    const { sql: dataExpr, params: setParams } = buildUpdateSql(sets);
    const updateParams = [...setParams, partition, streamId, streamPosition];
    let updateTypeFilter = "";
    if (messageType) {
      updateParams.push(messageType);
      updateTypeFilter = ` AND message_type = $${updateParams.length}`;
    }

    const updateSql = `UPDATE emt_messages
      SET message_data = ${dataExpr}
      WHERE partition = $${setParams.length + 1}
        AND is_archived = FALSE
        AND stream_id = $${setParams.length + 2}
        AND stream_position = $${setParams.length + 3}${updateTypeFilter}`;

    if (dryRun) {
      console.log("\nDRY_RUN: would execute:");
      console.log(updateSql);
      console.log("Params:", updateParams);
      return;
    }

    await client.query("BEGIN");
    try {
      const result = await client.query(updateSql, updateParams);
      if ((result.rowCount ?? 0) !== 1) {
        throw new Error(`Expected to update 1 row, got ${result.rowCount ?? 0}`);
      }

      const after = await client.query<{ message_type: string; message_data: unknown }>(
        `SELECT message_type, message_data
         FROM emt_messages
         WHERE partition = $1 AND is_archived = FALSE
           AND stream_id = $2 AND stream_position = $3`,
        [partition, streamId, streamPosition]
      );

      await client.query("COMMIT");

      console.log("\nAfter:");
      console.log(
        JSON.stringify(
          { message_type: after.rows[0]?.message_type, message_data: after.rows[0]?.message_data },
          null,
          2
        )
      );
      console.log("\nDone. Rebuild affected projections with `pnpm rebuild:projections`.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
