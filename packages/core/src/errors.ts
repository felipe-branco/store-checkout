/**
 * Shared error types and helpers for command handling and API responses.
 */

// ---------------------------------------------------------------------------
// Command result types (Option B - return result)
// ---------------------------------------------------------------------------

export type CommandSuccess<T> = {
  success: true;
  newEvents: T[];
};

export type CommandFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    commandType: string;
    streamId?: string;
    cause?: unknown;
    correlationId?: string;
  };
};

export type CommandResult<T> = CommandSuccess<T> | CommandFailure;

// ---------------------------------------------------------------------------
// Send result (what sendCommand returns)
// ---------------------------------------------------------------------------

export type SendResult =
  | { success: true; eventsPublished: number }
  | { success: false; error: CommandFailure["error"] };

/**
 * Interface for command dispatch with result return.
 * Implemented by CommandDispatcher in the web app.
 */
export interface ICommandDispatcher {
  register<C extends { type: string }>(
    commandType: C["type"],
    handler: (command: C) => Promise<CommandResult<import("@store-checkout/event-store").Event>>
  ): void;
  sendCommand(
    command: { type: string },
    correlationId?: string
  ): Promise<SendResult>;
}

// ---------------------------------------------------------------------------
// API error response
// ---------------------------------------------------------------------------

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  correlationId?: string;
}

/**
 * Create a consistent API error response object.
 */
export function createErrorResponse(
  error: string,
  code: string,
  correlationId?: string
): ApiErrorResponse {
  return {
    success: false,
    error,
    code,
    ...(correlationId && { correlationId }),
  };
}
