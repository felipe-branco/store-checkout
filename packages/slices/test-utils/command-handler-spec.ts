import type { PostgresEventStore } from "@em-slices/event-store";
import { createEmmettEventStore, projections } from "@em-slices/event-store";
import type { Event } from "@em-slices/event-store";
import type { CommandResult } from "@em-slices/core";

/**
 * Stream state for setting up initial events in a stream
 */
export interface StreamState {
  streamId: string;
  events: Event[];
  expectedVersion?: number;
}

/**
 * Builder for setting up initial stream state
 */
export function existingStream(
  streamId: string,
  events: Event[]
): StreamState {
  return { streamId, events };
}

type CommandHandler<C, E extends Event> = (
  command: C,
  eventStore: PostgresEventStore
) => Promise<CommandResult<E>>;

/**
 * Command handler specification for integration testing
 */
export class CommandHandlerSpec<C, E extends Event> {
  private constructor(
    private readonly handler: CommandHandler<C, E>,
    private readonly connectionString: string
  ) {}

  static for<C, E extends Event>(config: {
    handler: CommandHandler<C, E>;
    connectionString: string;
  }): (initialState: StreamState[]) => WhenBuilder<C, E> {
    const spec = new CommandHandlerSpec(config.handler, config.connectionString);
    return (initialState: StreamState[]) =>
      new WhenBuilder(spec.handler, spec.connectionString, initialState);
  }
}

class WhenBuilder<C, E extends Event> {
  constructor(
    private readonly handler: CommandHandler<C, E>,
    private readonly connectionString: string,
    private readonly initialState: StreamState[]
  ) {}

  when(command: C): ThenBuilder<C, E> {
    return new ThenBuilder(
      this.handler,
      this.connectionString,
      this.initialState,
      command
    );
  }
}

class ThenBuilder<C, E extends Event> {
  constructor(
    private readonly handler: CommandHandler<C, E>,
    private readonly connectionString: string,
    private readonly initialState: StreamState[],
    private readonly command: C
  ) {}

  async then(
    assertion: (events: E[], eventStore: PostgresEventStore) => Promise<void> | void
  ): Promise<void> {
    const eventStore = createEmmettEventStore(this.connectionString, {
      projections: projections.inline([]),
      schema: { autoMigration: "None" },
    });
    await eventStore.schema?.migrate();
    await seedStreams(eventStore, this.initialState);

    const result = await this.handler(this.command, eventStore);
    assertCommandSuccess(result);
    await assertion(result.newEvents, eventStore);
  }
}

function assertCommandSuccess<E extends Event>(result: CommandResult<E>): asserts result is {
  success: true;
  newEvents: E[];
} {
  if (!result.success) {
    throw new Error(
      `Command handler failed: ${result.error.code} - ${result.error.message}`
    );
  }
}

async function seedStreams(
  eventStore: PostgresEventStore,
  initialState: StreamState[]
): Promise<void> {
  for (const state of initialState) {
    if (state.events.length === 0) continue;

    let expectedVersion = state.expectedVersion;
    if (expectedVersion === undefined) {
      const existingStream = await eventStore.readStream(state.streamId);
      expectedVersion = existingStream.streamExists
        ? Number(existingStream.currentStreamVersion)
        : -1;
    }

    await eventStore.appendToStream(state.streamId, state.events, {
      expectedStreamVersion:
        expectedVersion === -1 ? "STREAM_DOES_NOT_EXIST" : BigInt(expectedVersion),
    });
  }
}
