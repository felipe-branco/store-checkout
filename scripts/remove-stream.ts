#!/usr/bin/env tsx
/**
 * Remove a stream from the event store.
 *
 * Deletes all messages and the stream record for the given stream_id.
 * LOCAL ENVIRONMENT ONLY.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." pnpm remove:stream <stream_id>
 *
 * Examples:
 *   pnpm remove:stream a8de2c55-8dd6-51fc-8c99-9307ba6396dc
 *   pnpm remove:stream 29dee274-6677-5745-9a55-3abd2efca9be
 */

import { normalizePostgresUrlForPgSsl } from "@em-slices/event-store";
import pg from "pg";

const PARTITION = "emt:default";

const streamId = process.argv[2]?.trim();
if (!streamId) {
  console.error("Usage: DATABASE_URL=... pnpm remove:stream <stream_id>");
  process.exit(1);
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const connectionString = normalizePostgresUrlForPgSsl(rawUrl);

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const msgResult = await client.query(
      `DELETE FROM emt_messages WHERE partition = $1 AND is_archived = FALSE AND stream_id = $2`,
      [PARTITION, streamId]
    );
    const streamResult = await client.query(
      `DELETE FROM emt_streams WHERE partition = $1 AND is_archived = FALSE AND stream_id = $2`,
      [PARTITION, streamId]
    );

    const msgCount = msgResult.rowCount ?? 0;
    const streamCount = streamResult.rowCount ?? 0;

    if (msgCount === 0 && streamCount === 0) {
      console.log(`No stream found for stream_id: ${streamId}`);
    } else {
      console.log(`Removed stream ${streamId}: ${msgCount} message(s), ${streamCount} stream record(s)`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
