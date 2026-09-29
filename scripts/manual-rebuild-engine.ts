/**
 * Generic manual rebuild engine for Pongo projections.
 *
 * Reads events from the event store, applies projection evolve logic, writes to Pongo.
 * Bypasses rebuildPostgreSQLProjections (which fails to persist writes).
 */

import {
  createEventStoreFromEnv,
  normalizePostgresUrlForPgSsl,
  pongoClient,
} from "@store-checkout/event-store";
import pg from "pg";
import type { ManualRebuildConfig } from "./manual-rebuild-config";

export async function runManualRebuild(
  connectionString: string,
  configs: ManualRebuildConfig[]
): Promise<{ projection: string; processed: number; documents: number }[]> {
  const pgUrl = normalizePostgresUrlForPgSsl(connectionString);
  const eventStore = createEventStoreFromEnv();
  const db = pongoClient(pgUrl).db();
  const client = new pg.Client({ connectionString: pgUrl });
  await client.connect();

  const results: { projection: string; processed: number; documents: number }[] = [];

  try {
    const streamsResult = await client.query(
      `SELECT DISTINCT stream_id FROM emt_messages 
       WHERE partition = $1 AND is_archived = FALSE 
       ORDER BY stream_id`,
      ["emt:default"]
    );
    const streamIds = streamsResult.rows.map((r: { stream_id: string }) => r.stream_id);

    for (const config of configs) {
      const { collectionName, canHandle, evolve, getDocumentId } = config;
      const canHandleSet = new Set(canHandle);
      const getDocId =
        getDocumentId ?? ((_e: unknown, streamId: string) => streamId);

      const col = db.collection(collectionName);
      await col.deleteMany();

      let processed = 0;
      for (const streamId of streamIds) {
        try {
          const { events } = await eventStore.readStream(streamId);
          for (const event of events) {
            if (!canHandleSet.has(event.type)) continue;

            const docId = getDocId(
              event as { data: Record<string, unknown>; metadata?: { streamName?: string } },
              streamId
            );
            if (!docId) continue;

            const current = await col.findOne({ _id: docId });
            const newDoc = evolve(
              current ?? null,
              event as Parameters<ManualRebuildConfig["evolve"]>[1]
            );
            if (newDoc != null) {
              await col.handle(docId, async () => newDoc);
              processed++;
            } else if (current != null) {
              await col.deleteOne({ _id: docId });
              processed++;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes("not found") && !msg.includes("StreamNotFound")) {
            console.warn(`  Stream ${streamId}:`, msg);
          }
        }
      }

      const count = (await col.find({})).length;
      results.push({ projection: collectionName, processed, documents: count });
    }
  } finally {
    await client.end();
  }

  return results;
}
