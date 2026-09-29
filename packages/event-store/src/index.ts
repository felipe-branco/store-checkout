// Event Store
export {
  createEventStore,
  createEventStoreFromEnv,
  createEmmettEventStore,
  createEmmettEventStoreFromEnv,
} from './createEventStore';
export { normalizePostgresUrlForPgSsl } from './normalizePostgresUrlForPgSsl';

// Re-export emmett types and utilities
export type {
  Command,
  Event,
  EventStore,
  ReadEvent,
  EventDataOf,
  MessageBus,
  EventSubscription,
  CommandProcessor,
  ScheduledMessageProcessor,
} from '@event-driven-io/emmett';
export {
  CommandHandler,
  DeciderCommandHandler,
  DeciderSpecification,
  getInMemoryMessageBus,
  getInMemoryEventStore,
  projections,
} from '@event-driven-io/emmett';

// Re-export emmett-postgresql utilities
export {
  pongoSingleStreamProjection,
  pongoMultiStreamProjection,
  PostgreSQLProjectionSpec,
  expectPongoDocuments,
} from '@event-driven-io/emmett-postgresql';
export type {
  PostgresReadEventMetadata,
  PostgresEventStore,
  PostgresEventStoreOptions,
  PostgreSQLProjectionDefinition,
} from '@event-driven-io/emmett-postgresql';
export { rebuildPostgreSQLProjections } from '@event-driven-io/emmett-postgresql';

// Re-export Pongo client for querying projections
export { pongoClient } from '@event-driven-io/pongo';
export type { PongoDb } from '@event-driven-io/pongo';
