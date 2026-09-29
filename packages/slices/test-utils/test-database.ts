import type { StartedPostgreSqlContainer } from "@em-slices/event-store/test-utils";
import { PostgreSqlContainer } from "@em-slices/event-store/test-utils";
import type { PostgresEventStore, PongoDb } from "@em-slices/event-store";
import { createEmmettEventStore, pongoClient, projections } from "@em-slices/event-store";
import { INLINE_PROJECTIONS } from "../src/projections-inline";

export interface TestDatabase {
  postgres: StartedPostgreSqlContainer;
  connectionString: string;
  eventStore: PostgresEventStore;
  pongoDb: PongoDb;
}

export async function setupTestDatabase(): Promise<TestDatabase> {
  const postgres = await new PostgreSqlContainer("postgres:16").start();
  const connectionString = postgres.getConnectionUri();

  const eventStore = createEmmettEventStore(connectionString, {
    projections: projections.inline(INLINE_PROJECTIONS),
    schema: { autoMigration: "None" },
  });
  await eventStore.schema?.migrate();

  const pongoDb = pongoClient(connectionString).db();

  return { postgres, connectionString, eventStore, pongoDb };
}

export async function cleanupTestDatabase(testDb: TestDatabase): Promise<void> {
  await testDb.postgres.stop();
}
