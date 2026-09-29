import type { Slice, Command, ReadModel, Processor } from "../types/codegen-slice.js";
import { toPascalCase } from "../utils/naming.js";
import { mapFieldToZod } from "../utils/type-mapping.js";

/**
 * Generate route handler code for STATE_CHANGE slices (command handlers)
 *
 * Framework-agnostic route handler that validates input with Zod,
 * creates the command, and delegates to the command handler.
 */
export function generateCommandRoute(slice: Slice, command: Command): string {
  const sliceName = toPascalCase(slice.title);
  const commandName = toPascalCase(command.title);
  const aggregateName = command.aggregate;
  const aggregateIdField = `${aggregateName.charAt(0).toLowerCase() + aggregateName.slice(1)}Id`;
  const event = slice.events[0];
  const aggregateIdFieldName = event?.fields.find((f) => f.idAttribute)?.name ?? aggregateIdField;

  // Build Zod schema entries from command fields (aggregate ID added separately as optional)
  const zodFields = command.fields
    .filter((field) => !field.generated && field.name !== aggregateIdFieldName)
    .map((field) => `  ${field.name}: ${mapFieldToZod(field)},`)
    .join("\n");

  // Build command data mapping (aggregate ID added separately)
  const commandDataMapping = command.fields
    .filter((field) => !field.generated && field.name !== aggregateIdFieldName)
    .map((field) => `        ${field.name}: validated.${field.name},`)
    .join("\n");

  return `import { randomUUID } from "crypto";
import { z } from "zod";
import type { ${commandName}Command } from "./${sliceName}Command";
import type { ICommandDispatcher } from "@em-slices/core";

// ---------------------------------------------------------------------------
// Zod schema — validates incoming request params before creating the command
// ---------------------------------------------------------------------------
export const ${commandName}Schema = z.object({
  ${aggregateIdFieldName}: z.uuid().optional(),
${zodFields}
});

export type ${commandName}RouteParams = z.input<typeof ${commandName}Schema>;

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------
export interface ${commandName}RouteResponse {
  success: true;
  ${aggregateIdFieldName}: string;
}

export interface ${commandName}RouteError {
  success: false;
  error: string;
  code?: "ALREADY_EXISTS" | "VALIDATION_ERROR" | "UNKNOWN_ERROR";
  correlationId?: string;
}

export type ${commandName}RouteResult =
  | ${commandName}RouteResponse
  | ${commandName}RouteError;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * Framework-agnostic route handler for ${command.title}
 *
 * API Endpoint: ${command.apiEndpoint || "/api/unknown"}
 *
 * 1. Validates input with Zod
 * 2. Creates the command (with generated IDs & timestamps)
 * 3. Dispatches via dispatcher.sendCommand (returns SendResult)
 *
 * @param params        - Raw request body (will be validated by Zod)
 * @param dispatcher    - Command dispatcher for sendCommand
 * @param correlationId - Optional correlation ID for tracing
 */
export async function handle${commandName}Route(
  params: unknown,
  dispatcher: ICommandDispatcher,
  correlationId?: string
): Promise<${commandName}RouteResult> {
  try {
    // Validate input
    const validated = ${commandName}Schema.parse(params);

    // Generate aggregate ID if not provided
    const ${aggregateIdFieldName} = validated.${aggregateIdFieldName} || randomUUID();

    // Create command (propagate correlation_id, causation_id for audit trail)
    const command: ${commandName}Command = {
      type: "${commandName}",
      data: {
        ${aggregateIdFieldName},
${commandDataMapping}
      },
      metadata: {
        now: new Date(),
        correlation_id: correlationId,
        causation_id: ${aggregateIdFieldName},
      },
    };

    const result = await dispatcher.sendCommand(command, correlationId);

    if (!result.success) {
      const routeCode: ${commandName}RouteError["code"] =
        result.error.message.includes("already exists")
          ? "ALREADY_EXISTS"
          : "UNKNOWN_ERROR";

      return {
        success: false,
        error: result.error.message,
        code: routeCode,
        correlationId: result.error.correlationId ?? correlationId,
      };
    }

    return {
      success: true,
      ${aggregateIdFieldName},
    };
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
        correlationId,
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: errorMessage,
      code: "UNKNOWN_ERROR",
      correlationId,
    };
  }
}
`;
}

/**
 * Generate route handler code for STATE_VIEW slices (projection queries)
 *
 * Framework-agnostic route handler that can be used by any framework (Next.js, Express, etc.)
 */
export function generateProjectionRoute(slice: Slice, readModel: ReadModel): string {
  const projectionName = toPascalCase(slice.title);
  const readModelName = toPascalCase(readModel.title || slice.title);
  const isList = readModel.listElement || false;
  const queryFunctionImports = isList
    ? `getAll${readModelName}, get${readModelName}ById`
    : `get${readModelName}ById`;

  return `import type { EventStore, PongoDb } from "@em-slices/event-store";
import { ${queryFunctionImports}, type ${readModelName}ReadModel } from "./${projectionName}Projection";

/**
 * Request parameters for ${readModelName} query handler
 */
export interface ${readModelName}RouteParams {
  streamId?: string;
  [key: string]: unknown;
}

/**
 * Response data for ${readModelName} query handler
 */
export interface ${readModelName}RouteResponse {
  success: true;
  data: ${isList ? `${readModelName}ReadModel | ${readModelName}ReadModel[]` : `${readModelName}ReadModel | null`};
}

/**
 * Error response for ${readModelName} query handler
 */
export interface ${readModelName}RouteError {
  success: false;
  error: string;
}

export type ${readModelName}RouteResult = ${readModelName}RouteResponse | ${readModelName}RouteError;

/**
 * Framework-agnostic route handler for ${readModelName}
 *
 * API Endpoint: ${readModel.apiEndpoint || "/api/unknown"}
 *
 * @param params - Request parameters (query params)
 * @param eventStore - Event store instance
 * @param db - Pongo database instance for querying projections
 * @returns Result object with success status and data or error
 */
export async function handle${readModelName}Route(
  params: ${readModelName}RouteParams,
  eventStore: EventStore,
  db: PongoDb
): Promise<${readModelName}RouteResult> {
  try {
    const { streamId } = params;
    // eventStore is kept for consistency with route handler signature, may be used for future operations
    void eventStore;

    ${isList ? `if (streamId) {
      const readModelData = await get${readModelName}ById(db, streamId);
      return {
        success: true,
        data: readModelData as any, // Single document for list view when streamId provided
      };
    }

    const allItems = await getAll${readModelName}(db);
    return {
      success: true,
      data: allItems,
    };` : `const readModelData = await get${readModelName}ById(db, streamId || "");

    return {
      success: true,
      data: readModelData,
    };`}
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
`;
}

/**
 * Generate route handler code for TRANSLATOR slices (webhook / external message intake)
 *
 * Framework-agnostic route handler that receives external payloads,
 * parses them, and delegates to the translator.
 */
export function generateTranslatorRoute(slice: Slice, processor: Processor): string {
  const sliceName = toPascalCase(slice.title);
  const translatorName = toPascalCase(processor.title);

  return `import type { ICommandDispatcher } from "@em-slices/core";
import {
  translate${translatorName},
  parseExternalPayload,
  type ExternalPayload,
} from "./${sliceName}Translator";

/**
 * Request parameters for ${translatorName} webhook handler
 */
export interface ${translatorName}RouteParams {
  /** Raw payload from the external system */
  payload: ExternalPayload;
  /** Correlation ID for tracing (e.g. provider event id from payload or header) */
  correlationId?: string;
}

/**
 * Response data for ${translatorName} webhook handler
 */
export interface ${translatorName}RouteResponse {
  success: true;
  message: string;
}

/**
 * Error response for ${translatorName} webhook handler
 */
export interface ${translatorName}RouteError {
  success: false;
  error: string;
  code?: "PARSE_ERROR" | "TRANSLATION_ERROR" | "UNKNOWN_ERROR";
  correlationId?: string;
}

export type ${translatorName}RouteResult = ${translatorName}RouteResponse | ${translatorName}RouteError;

/**
 * Framework-agnostic route handler for ${translatorName}
 *
 * API Endpoint: ${processor.apiEndpoint || "/api/webhooks/unknown"}
 *
 * Receives a raw external payload, parses it into a typed external event,
 * and delegates to the translator to dispatch internal commands via the dispatcher.
 *
 * @param params - Request parameters containing the raw payload and optional correlationId
 * @param dispatcher - Command dispatcher for sendCommand (returns SendResult)
 * @returns Result object with success status or error
 */
export async function handle${translatorName}Route(
  params: ${translatorName}RouteParams,
  dispatcher: ICommandDispatcher
): Promise<${translatorName}RouteResult> {
  const { correlationId } = params;

  try {
    // Parse the raw external payload into a typed event
    const externalEvent = parseExternalPayload(params.payload);

    // Translate and dispatch internal command(s) via dispatcher
    const sendResult = await translate${translatorName}(
      externalEvent,
      dispatcher,
      correlationId
    );

    if (!sendResult.success) {
      const routeCode: ${translatorName}RouteError["code"] =
        ["PARSE_ERROR", "TRANSLATION_ERROR", "UNKNOWN_ERROR"].includes(
          sendResult.error.code
        )
          ? (sendResult.error.code as ${translatorName}RouteError["code"])
          : "UNKNOWN_ERROR";

      return {
        success: false,
        error: sendResult.error.message,
        code: routeCode,
        correlationId: sendResult.error.correlationId ?? correlationId,
      };
    }

    return {
      success: true,
      message: "External event translated and dispatched successfully",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const code = errorMessage.includes("parse") || errorMessage.includes("payload")
      ? ("PARSE_ERROR" as const)
      : errorMessage.includes("translat")
      ? ("TRANSLATION_ERROR" as const)
      : ("UNKNOWN_ERROR" as const);

    return {
      success: false,
      error: errorMessage,
      code,
      correlationId,
    };
  }
}
`;
}
