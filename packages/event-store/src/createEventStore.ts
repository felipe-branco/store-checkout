import { getPostgreSQLEventStore } from "@event-driven-io/emmett-postgresql";
import type { PostgresEventStore, PostgresEventStoreOptions } from "@event-driven-io/emmett-postgresql";
import { normalizePostgresUrlForPgSsl } from "./normalizePostgresUrlForPgSsl";

/**
 * Create an Emmett PostgresEventStore instance.
 *
 * @param connectionString - PostgreSQL connection string
 * @param options - Optional PostgreSQL event store options (e.g., projections)
 * @returns Emmett PostgresEventStore instance
 */
export function createEmmettEventStore(
  connectionString: string,
  options?: PostgresEventStoreOptions
): PostgresEventStore {
  return getPostgreSQLEventStore(connectionString, options);
}

/**
 * Create an Emmett PostgresEventStore from environment variables.
 *
 * Reads DATABASE_URL from environment.
 *
 * @param options - Optional PostgreSQL event store options (e.g., projections)
 * @returns Emmett PostgresEventStore instance
 */
export function createEmmettEventStoreFromEnv(
  options?: PostgresEventStoreOptions
): PostgresEventStore {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is required. " +
      "Example: postgresql://user:password@localhost:5432/dbname"
    );
  }

  return createEmmettEventStore(normalizePostgresUrlForPgSsl(connectionString), options);
}

/** @deprecated Use createEmmettEventStore */
export const createEventStore = createEmmettEventStore;

/** @deprecated Use createEmmettEventStoreFromEnv */
export const createEventStoreFromEnv = createEmmettEventStoreFromEnv;
