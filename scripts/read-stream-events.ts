#!/usr/bin/env tsx
/**
 * Read events for any stream from the event store.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." pnpm read:stream-events <stream_id>
 *
 * If Postgres returns "the database system is starting up" (57P03), the script retries
 * for up to STREAM_EVENTS_DB_MAX_ATTEMPTS (default 45) × STREAM_EVENTS_DB_RETRY_MS (default 1000).
 * Wait until Docker marks the postgres container healthy, or tune those env vars.
 *
 * Examples:
 *   pnpm read:stream-events a8de2c55-8dd6-51fc-8c99-9307ba6396dc
 *   pnpm read:stream-events 29dee274-6677-5745-9a55-3abd2efca9be
 */

import { createEventStoreFromEnv } from "@store-checkout/event-store";

/** Postgres rejects connections while WAL recovery runs (Docker restart / crash recovery). */
function isPgStartingUp(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const pg = error as Error & { code?: string };
  if (pg.code === "57P03") return true;
  return /starting up/i.test(error.message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const streamId = process.argv[2];
if (!streamId) {
  console.error("Usage: DATABASE_URL=... pnpm read:stream-events <stream_id>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

async function main() {
  const eventStore = createEventStoreFromEnv();
  const maxAttempts = Number(process.env.STREAM_EVENTS_DB_MAX_ATTEMPTS ?? 45);
  const retryDelayMs = Number(process.env.STREAM_EVENTS_DB_RETRY_MS ?? 1000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { events, currentStreamVersion } = await eventStore.readStream(streamId);
      console.log(`Stream: ${streamId} (version: ${Number(currentStreamVersion)})`);
      console.log(`Events: ${events.length}\n`);
      const replacer = (_key: string, value: unknown) =>
        typeof value === "bigint" ? value.toString() : value;

      events.forEach((event, i) => {
        const e = event as { type: string; data: unknown; metadata?: unknown };
        console.log(`--- Event ${i + 1}: ${e.type} ---`);
        console.log(JSON.stringify({ type: e.type, data: e.data, metadata: e.metadata }, replacer, 2));
        console.log();
      });
      return;
    } catch (error) {
      if (isPgStartingUp(error) && attempt < maxAttempts) {
        console.warn(
          `[read-stream-events] Postgres is still starting (57P03). Retry ${attempt}/${maxAttempts} in ${retryDelayMs}ms… ` +
            "(wait for the DB container to be healthy, or increase STREAM_EVENTS_DB_MAX_ATTEMPTS)"
        );
        await sleep(retryDelayMs);
        continue;
      }
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("not found") || msg.includes("does not exist") || msg.includes("StreamNotFound")) {
        console.log(`No stream found for stream_id: ${streamId}`);
        return;
      }
      throw error;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
