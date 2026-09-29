import "server-only";

import { Axiom } from "@axiomhq/js";
import { AxiomJSTransport, Logger } from "@axiomhq/logging";
import { nextJsFormatters } from "@axiomhq/nextjs";

import { isAxiomReportingEnabled } from "./reporting";

/** Server-only ingest token — never use NEXT_PUBLIC_ for this. */
const token = process.env.AXIOM_TOKEN?.trim();
const dataset = process.env.AXIOM_DATASET?.trim();

let axiomLogger: Logger | null = null;

/**
 * Singleton Axiom logger for Node server + Node middleware only.
 * Returns null when Axiom is disabled ({@link isAxiomReportingEnabled}) or env is incomplete.
 */
export function getAxiomLogger(): Logger | null {
  if (!isAxiomReportingEnabled() || !token || !dataset) {
    return null;
  }
  if (!axiomLogger) {
    const axiomClient = new Axiom({ token });
    axiomLogger = new Logger({
      transports: [new AxiomJSTransport({ axiom: axiomClient, dataset })],
      formatters: nextJsFormatters,
    });
  }
  return axiomLogger;
}

export async function flushAxiomLogs(): Promise<void> {
  await getAxiomLogger()?.flush();
}
