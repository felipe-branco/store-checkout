# Event Store Package

Event store implementation using `@event-driven-io/emmett` with PostgreSQL.

## Usage

### Basic Setup

```typescript
import {
  createEmmettEventStore,
  createEmmettEventStoreFromEnv,
} from "@em-slices/event-store";

// Option 1: Create from connection string
const eventStore = createEmmettEventStore(
  "postgresql://user:password@localhost:5432/dbname",
  { schema: { autoMigration: "None" } }
);

// Option 2: Create from environment variable (DATABASE_URL)
const eventStore = createEmmettEventStoreFromEnv();
```

`createEventStore` / `createEventStoreFromEnv` are deprecated aliases for the Emmett factories above.

### Command handlers

STATE_CHANGE slices use Emmett's `DeciderCommandHandler` with `PostgresEventStore`:

```typescript
import { DeciderCommandHandler, type PostgresEventStore } from "@em-slices/event-store";

const run = DeciderCommandHandler({ decide, evolve, initialState });

export async function handleMyCommand(command, eventStore: PostgresEventStore) {
  const result = await run(eventStore, command.data.aggregate_id, command);
  return { success: true, newEvents: result.newEvents };
}
```

### Appending and reading streams

```typescript
await eventStore.appendToStream(streamId, events, {
  expectedStreamVersion: "STREAM_DOES_NOT_EXIST", // new stream
});

const stream = await eventStore.readStream(streamId);
const version = Number(stream.currentStreamVersion);
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
  - `createEmmettEventStoreFromEnv` normalizes `sslmode=require|prefer|verify-ca` to `verify-full`. Use `normalizePostgresUrlForPgSsl()` for raw `pg` / Pongo clients in the same process.

## Architecture

The package re-exports Emmett's `PostgresEventStore`, `DeciderCommandHandler`, projection utilities, and Pongo client helpers. Production apps register inline projections on the event store so STATE_VIEW read models update automatically when events are appended.
