#!/usr/bin/env tsx
/**
 * Diagnose projection rebuild issues (event store, stream read, Pongo).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." pnpm tsx scripts/diagnose-rebuild.ts [stream_id] [collection_name]
 *
 * Example:
 *   DATABASE_URL="postgresql://store_checkout:store_checkout@localhost:5432/store_checkout" pnpm tsx scripts/diagnose-rebuild.ts <stream_id> itemlist-collection
 */

import {
  createEventStoreFromEnv,
  normalizePostgresUrlForPgSsl,
  pongoClient,
} from "@store-checkout/event-store";
import pg from "pg";

const streamId = process.argv[2];
const collectionName = process.argv[3];

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const connectionString = normalizePostgresUrlForPgSsl(rawUrl);

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM emt_messages WHERE partition = $1 AND is_archived = FALSE`,
      ["emt:default"]
    );
    const messageCount = parseInt(countResult.rows[0]?.count ?? "0", 10);
    console.log(`\n1. emt_messages (partition=emt:default): ${messageCount} rows`);

    if (messageCount > 0) {
      const sampleResult = await client.query(
        `SELECT stream_id, message_type, global_position FROM emt_messages 
         WHERE partition = $1 AND is_archived = FALSE 
         ORDER BY global_position LIMIT 5`,
        ["emt:default"]
      );
      console.log("   Sample rows:");
      sampleResult.rows.forEach((r) =>
        console.log(`     stream_id=${r.stream_id} type=${r.message_type} global_position=${r.global_position}`)
      );
    }

    if (streamId) {
      const eventStore = createEventStoreFromEnv();
      try {
        const { events, currentStreamVersion } = await eventStore.readStream(streamId);
        console.log(`\n2. readStream("${streamId}"): ${events.length} events (version ${currentStreamVersion})`);
        events.forEach((e, i) => {
          console.log(`   Event ${i + 1}: ${e.type}`);
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("not found") || msg.includes("StreamNotFound")) {
          console.log(`\n2. readStream("${streamId}"): stream not found`);
        } else {
          throw err;
        }
      }
    }

    if (collectionName) {
      const db = pongoClient(connectionString).db();
      const col = db.collection(collectionName);
      const docs = (await col.find({})) as unknown as Array<{ _id: string }>;
      console.log(`\n3. ${collectionName}: ${docs.length} documents`);
      docs.slice(0, 5).forEach((d) => console.log(`   _id=${d._id}`));
    } else {
      console.log("\n3. (optional) Pass collection_name as 2nd arg to inspect Pongo read model");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
