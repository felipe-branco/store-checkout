#!/usr/bin/env tsx
/**
 * Remove the last N event(s) from an Emmett PostgreSQL stream (contiguous tail only).
 *
 * Updates `emt_streams.stream_position` to match MAX(stream_position) after DELETE.
 * Does not fix Pongo/projections — rebuild or patch read models if needed.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." pnpm remove:stream-tail <stream_id> <stream_position> [<stream_position> ...]
 *
 * Positions must be exactly the final positions on the stream (suffix), e.g. if the
 * stream has four events, `3 4` removes the third and fourth only.
 *
 * Optional env:
 *   DRY_RUN=1 — print planned actions, do not commit
 *
 * Example (remove last two events on a stream at positions 3–4):
 *   pnpm remove:stream-tail <stream_id> 3 4
 */

import { normalizePostgresUrlForPgSsl } from "@store-checkout/event-store";
import pg from "pg";

const PARTITION = "emt:default";

function parseArgs(): { streamId: string; positions: number[]; dryRun: boolean } {
  const argvRaw = process.argv.slice(2);
  const dryRunFromFlag = argvRaw.includes("--dry-run");
  const argv = argvRaw.filter((a) => a !== "--dry-run");
  const dryRun =
    dryRunFromFlag || process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const streamId = argv[0]?.trim();
  const posArgs = argv.slice(1).map((s) => Number(s.trim(), 10));
  if (!streamId || posArgs.length === 0 || posArgs.some((n) => !Number.isInteger(n) || n < 1)) {
    console.error(
      "Usage: DATABASE_URL=... pnpm remove:stream-tail <stream_id> <stream_position> [more positions...]\n" +
        "Optional: DRY_RUN=1 or pass --dry-run\n" +
        "Example: pnpm remove:stream-tail c61cc9c7-b3b6-4221-91b2-96c89c5aeb73 3 4"
    );
    process.exit(1);
  }
  const sortedUnique = [...new Set(posArgs)].sort((a, b) => a - b);
  for (let i = 1; i < sortedUnique.length; i++) {
    if (sortedUnique[i] !== sortedUnique[i - 1]! + 1) {
      console.error("stream_position arguments must be a contiguous range (e.g. 3 4, not 3 5).");
      process.exit(1);
    }
  }
  return { streamId, positions: sortedUnique, dryRun };
}

async function main() {
  const { streamId, positions, dryRun } = parseArgs();

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const connectionString = normalizePostgresUrlForPgSsl(rawUrl);

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const { rows: posRows } = await client.query<{ stream_position: string }>(
      `SELECT stream_position::text AS stream_position
       FROM emt_messages
       WHERE partition = $1 AND is_archived = FALSE AND stream_id = $2
       ORDER BY stream_position::bigint ASC`,
      [PARTITION, streamId]
    );
    const existing = posRows.map((r) => Number(r.stream_position, 10));
    if (existing.length === 0) {
      console.error(`No messages for stream_id=${streamId}`);
      process.exit(1);
    }

    const maxP = existing[existing.length - 1]!;
    const minRemove = positions[0]!;
    const maxRemove = positions[positions.length - 1]!;

    if (maxRemove !== maxP) {
      console.error(
        `Highest stream_position on stream is ${maxP}; you asked to remove up to ${maxRemove}. ` +
          `Only the tail of the stream can be removed (last events first).`
      );
      process.exit(1);
    }

    const tail = existing.slice(-positions.length);
    if (tail.length !== positions.length || !tail.every((p, i) => p === positions[i])) {
      console.error(
        `Requested positions ${positions.join(", ")} do not match the stream tail. ` +
          `Current positions: ${existing.join(", ")}`
      );
      process.exit(1);
    }

    const { rows: preview } = await client.query<{ stream_position: string; message_type: string }>(
      `SELECT stream_position::text, message_type
       FROM emt_messages
       WHERE partition = $1 AND is_archived = FALSE AND stream_id = $2
         AND stream_position = ANY($3::bigint[])`,
      [PARTITION, streamId, positions]
    );

    console.log("Planned removal:");
    for (const row of [...preview].sort((a, b) => Number(a.stream_position) - Number(b.stream_position))) {
      console.log(`  position ${row.stream_position}: ${row.message_type}`);
    }

    if (dryRun) {
      console.log("\nDRY_RUN: no changes committed.");
      return;
    }

    await client.query("BEGIN");
    try {
      const del = await client.query(
        `DELETE FROM emt_messages
         WHERE partition = $1 AND is_archived = FALSE AND stream_id = $2
           AND stream_position = ANY($3::bigint[])`,
        [PARTITION, streamId, positions]
      );

      const upd = await client.query(
        `UPDATE emt_streams s
         SET stream_position = COALESCE(
           (SELECT MAX(m.stream_position)
            FROM emt_messages m
            WHERE m.partition = s.partition
              AND m.is_archived = s.is_archived
              AND m.stream_id = s.stream_id),
           0
         )
         WHERE s.partition = $1 AND s.is_archived = FALSE AND s.stream_id = $2`,
        [PARTITION, streamId]
      );

      await client.query("COMMIT");
      console.log(`\nDone: deleted ${del.rowCount ?? 0} row(s); emt_streams updated (${upd.rowCount ?? 0} row).`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
