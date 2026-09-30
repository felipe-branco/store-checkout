import "server-only";

import { resolveCorrelationId } from "@/lib/api-log-correlation";
import { withAxiomRouteHandler } from "@/lib/axiom/route-handler";
import { logger } from "@/lib/logger";

export { resolveCorrelationId } from "@/lib/api-log-correlation";

export type ApiLogContext = {
  correlationId: string;
  route: string;
  method: string;
};

export type ApiLogFields = {
  durationMs: number;
  status: number;
  success: boolean;
  commandType?: string;
  aggregateId?: string;
  error?: string;
  /** Safe extras only — never payment PAN/CVC or raw card payloads. */
  [key: string]: string | number | boolean | undefined;
};

export function logApiRequest(
  ctx: ApiLogContext,
  fields: ApiLogFields,
  message = "API request completed"
): void {
  const payload = { component: "api" as const, ...ctx, ...fields };
  if (fields.status >= 500) {
    logger.error(payload, message);
    return;
  }
  if (fields.status >= 400 || fields.success === false) {
    logger.warn(payload, message);
    return;
  }
  logger.info(payload, message);
}

type AppRouteHandler = (request: Request, context?: unknown) => Response | Promise<Response>;

export type ApiLogEnricher = (input: {
  request: Request;
  response: Response;
  durationMs: number;
}) => Partial<ApiLogFields> | Promise<Partial<ApiLogFields>>;

export type WithLoggedApiRouteOptions = {
  enrich?: ApiLogEnricher;
};

/**
 * Wraps an App Router handler with Axiom route timing (when configured) and structured pino logs.
 */
export function withLoggedApiRoute(
  method: string,
  route: string,
  handler: AppRouteHandler,
  options?: WithLoggedApiRouteOptions
): AppRouteHandler {
  const wrapped = async (request: Request, context?: unknown): Promise<Response> => {
    const startedAt = performance.now();
    const correlationId = resolveCorrelationId(request);
    const logCtx: ApiLogContext = { correlationId, route, method };

    try {
      const response = await handler(request, context);
      const durationMs = Math.round(performance.now() - startedAt);
      const status = response.status;
      const enriched = options?.enrich
        ? await options.enrich({ request, response, durationMs })
        : {};

      logApiRequest(logCtx, {
        durationMs,
        status,
        success: status >= 200 && status < 400,
        ...enriched,
      });

      const headers = new Headers(response.headers);
      headers.set("x-correlation-id", correlationId);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logApiRequest(
        logCtx,
        {
          durationMs,
          status: 500,
          success: false,
          error: errorMessage,
        },
        "API request failed"
      );
      throw error;
    }
  };

  return withAxiomRouteHandler(wrapped as AppRouteHandler);
}
