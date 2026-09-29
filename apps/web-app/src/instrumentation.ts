import type { Instrumentation } from "next";

import { transformOnRequestError } from "@axiomhq/nextjs";

import { isSentryReportingEnabled } from "./sentry.common";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (isSentryReportingEnabled()) {
    const { captureRequestError } = await import("@sentry/nextjs");
    captureRequestError(error, request, context);
  }

  const { getAxiomLogger } = await import("@/lib/axiom/server-logger");
  const axiom = getAxiomLogger();
  if (!axiom) return;
  axiom.error(...transformOnRequestError(error, request, context));
  await axiom.flush();
};
