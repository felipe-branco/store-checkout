/**
 * Standard metadata types for events and commands.
 *
 * Used for distributed tracing, audit trails, and projection routing.
 * See EVENT_SOURCING_BEST_PRACTICES.md for propagation patterns.
 */

/** Event metadata — propagated from commands, used for projections */
export type EventMetadata = {
  correlation_id?: string;
  causation_id?: string;
  now?: Date;
  streamName?: string;
};

/** Command metadata — received from HTTP/translators, propagated to events */
export type CommandMetadata = {
  now: Date;
  correlation_id?: string;
  causation_id?: string;
};
