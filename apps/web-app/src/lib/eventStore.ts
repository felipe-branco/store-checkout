import {
  createEmmettEventStoreFromEnv,
  normalizePostgresUrlForPgSsl,
  pongoClient,
  projections,
  type PongoDb,
  type PostgresEventStore,
} from "@store-checkout/event-store";
import { INLINE_PROJECTIONS } from "@store-checkout/slices/src/projections-inline";

let eventStoreInstance: PostgresEventStore | null = null;
let pongoDbInstance: PongoDb | null = null;
let initializationInFlight = false;
let initializationPromise: Promise<void> | null = null;
let initializationError: Error | null = null;

export async function initializeEventStore(): Promise<void> {
  if (eventStoreInstance) return;
  if (initializationError) throw initializationError;
  if (initializationInFlight && initializationPromise) {
    await initializationPromise;
    return;
  }

  initializationInFlight = true;
  initializationPromise = (async () => {
    try {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is required");
      }

      const pgUrl = normalizePostgresUrlForPgSsl(connectionString);

      eventStoreInstance = createEmmettEventStoreFromEnv({
        projections: projections.inline(INLINE_PROJECTIONS),
        schema: { autoMigration: "None" },
      });
      await eventStoreInstance.schema?.migrate();

      pongoDbInstance = pongoClient(pgUrl).db();
    } catch (error) {
      const initError =
        error instanceof Error ? error : new Error("Failed to initialize event store");
      initializationError = initError;
      console.error("Error initializing event store:", initError.message);
      throw initError;
    }
  })();

  await initializationPromise;
}

export function getEventStore(): PostgresEventStore {
  if (!eventStoreInstance) {
    throw new Error(
      "Event store not initialized. Ensure initializeEventStore() has been called."
    );
  }
  return eventStoreInstance;
}

export function getPongoDb(): PongoDb {
  if (!pongoDbInstance) {
    throw new Error(
      "Pongo database not initialized. Ensure initializeEventStore() has been called."
    );
  }
  return pongoDbInstance;
}

export function getInitializationError(): Error | null {
  return initializationError;
}

export function resetInstances(): void {
  eventStoreInstance = null;
  pongoDbInstance = null;
  initializationInFlight = false;
  initializationPromise = null;
  initializationError = null;
}
