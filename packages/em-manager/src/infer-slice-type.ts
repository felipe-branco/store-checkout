import type { SliceType } from "./constants.js";
import type { ResolvedFlow } from "./types/resolved-view.js";
import { parseTypePrefix, stripTypePrefix } from "./prefix.js";

function flowHasType(flow: ResolvedFlow, type: string): boolean {
  return flow.cells.some((c) => c.nodeType === type);
}

function titleHeuristicSliceType(strippedTitle: string, flows: ResolvedFlow[]): SliceType | null {
  const lower = strippedTitle.toLowerCase();
  if (lower.endsWith("automator")) return "AUTOMATION";
  if (lower.startsWith("translate") || lower.includes("webhook")) return "TRANSLATOR";
  if (
    (lower.includes("list") || lower.includes("dashboard") || lower.includes("details")) &&
    !flows.some((f) => flowHasType(f, "COMMAND"))
  ) {
    return null;
  }
  return null;
}

function columnCompositionSliceType(flows: ResolvedFlow[]): SliceType | null {
  const hasAutomation = flows.some((f) => flowHasType(f, "AUTOMATION") || f.automations.length > 0);
  if (hasAutomation) return "AUTOMATION";

  const hasTranslatorSignals = flows.some(
    (f) =>
      flowHasType(f, "API") ||
      f.externalEvents.length > 0 ||
      f.apis.length > 0 ||
      (flowHasType(f, "EVENT") && !flowHasType(f, "COMMAND"))
  );
  if (hasTranslatorSignals) return "TRANSLATOR";

  const allCommandEvent = flows.every(
    (f) => flowHasType(f, "COMMAND") && flowHasType(f, "EVENT") && f.readModels.length === 0
  );
  if (allCommandEvent) return "STATE_CHANGE";

  const allReadModelEvent = flows.every(
    (f) => flowHasType(f, "READMODEL") && flowHasType(f, "EVENT") && !flowHasType(f, "COMMAND")
  );
  if (allReadModelEvent) return "STATE_VIEW";

  return null;
}

export interface InferSliceTypeInput {
  title: string;
  flows: ResolvedFlow[];
  explicitType?: SliceType;
  allowMissingPrefix?: boolean;
}

export function inferSliceType(input: InferSliceTypeInput): SliceType {
  if (input.explicitType) return input.explicitType;

  const prefixType = parseTypePrefix(input.title);
  if (prefixType) return prefixType;

  if (!input.allowMissingPrefix) {
    throw new Error(
      `Cannot infer slice type without type prefix on title: "${input.title}"`
    );
  }

  const stripped = stripTypePrefix(input.title);
  const heuristic = titleHeuristicSliceType(stripped, input.flows);
  if (heuristic) return heuristic;

  const composition = columnCompositionSliceType(input.flows);
  if (composition) return composition;

  throw new Error(`Ambiguous slice type for "${input.title}" — set sliceType manually in slice.ref.json`);
}
