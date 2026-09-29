import { Writable } from "node:stream";

import "server-only";

import pino from "pino";

import { flushAxiomLogs, getAxiomLogger } from "./axiom/server-logger";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";

function normalizePinoLevel(level: unknown): "debug" | "info" | "warn" | "error" {
  if (typeof level === "number") {
    if (level >= 50) return "error";
    if (level === 40) return "warn";
    if (level >= 30) return "info";
    return "debug";
  }
  const label = String(level).toLowerCase();
  if (label === "trace" || label === "debug") return "debug";
  if (label === "warn") return "warn";
  if (label === "error" || label === "fatal") return "error";
  return "info";
}

function createAxiomPinoBridge(): Writable | null {
  const axiomLogger = getAxiomLogger();
  if (!axiomLogger) return null;

  let flushQueued = false;
  const queueFlush = () => {
    if (flushQueued) return;
    flushQueued = true;
    setImmediate(() => {
      flushQueued = false;
      void flushAxiomLogs();
    });
  };

  return new Writable({
    write(chunk, _encoding, cb) {
      try {
        const obj = JSON.parse(String(chunk)) as Record<string, unknown>;
        const pinoLevel = normalizePinoLevel(obj.level);
        const msg =
          typeof obj.msg === "string"
            ? obj.msg
            : obj.msg !== undefined && obj.msg !== null
              ? JSON.stringify(obj.msg)
              : "";

        const fields = { ...obj };
        for (const key of ["msg", "level", "time", "pid", "hostname", "v"] as const) {
          delete fields[key];
        }

        const axiomPayload =
          Object.keys(fields).length > 0
            ? (fields as Record<string, string | number | boolean | null | undefined>)
            : undefined;

        axiomLogger.log(pinoLevel, msg, axiomPayload);
        queueFlush();
      } catch {
        /* avoid breaking callers if a line isn't valid JSON */
      }
      cb();
    },
  });
}

/**
 * Structured logger — JSON to stdout and, when configured, mirrored to Axiom.
 *
 * - LOG_LEVEL controls verbosity (defaults to info)
 * - AXIOM_TOKEN + AXIOM_DATASET enable Axiom ingestion (server only)
 */
const axiomSink = createAxiomPinoBridge();

const baseOptions: pino.LoggerOptions = {
  level: LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
};

export const logger = axiomSink
  ? pino(
      baseOptions,
      pino.multistream([
        { level: LOG_LEVEL as pino.Level, stream: process.stdout },
        { level: "trace" as pino.Level, stream: axiomSink },
      ])
    )
  : pino(baseOptions);
