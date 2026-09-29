import "server-only";

import { after } from "next/server";

import { flushAxiomLogs } from "./server-logger";

/**
 * Schedules an Axiom flush after the response is finished. Use at the start of long-running
 * serverless handlers (e.g. webhooks) so batched logs are not dropped when the isolate freezes.
 */
export function scheduleAxiomFlushAfterResponse(): void {
  after(() => {
    void flushAxiomLogs();
  });
}
