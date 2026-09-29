import "server-only";

import { createAxiomRouteHandler } from "@axiomhq/nextjs";

import { getAxiomLogger } from "./server-logger";

let wrappedFactory: ReturnType<typeof createAxiomRouteHandler> | null = null;

function getWrappedFactory() {
  const logger = getAxiomLogger();
  if (!logger) {
    return null;
  }
  if (!wrappedFactory) {
    wrappedFactory = createAxiomRouteHandler(logger);
  }
  return wrappedFactory;
}

/**
 * Wraps an App Router handler (GET/POST/…) with {@link createAxiomRouteHandler} when Axiom
 * reporting is enabled. Logs method, path, status, and duration to Axiom after each invocation.
 * Pass-through when Axiom is disabled (same as calling the handler directly).
 *
 * Typed loosely so handlers may use `NextRequest` or `Request` as the first parameter.
 */
export function withAxiomRouteHandler<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- App Router signatures vary (NextRequest, dynamic params).
  H extends (...args: any[]) => any,
>(handler: H): H {
  const factory = getWrappedFactory();
  if (!factory) {
    return handler;
  }
  return factory(handler as Parameters<typeof factory>[0]) as H;
}
