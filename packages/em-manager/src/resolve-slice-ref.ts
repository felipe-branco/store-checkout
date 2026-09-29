import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import {
  eventModelersSnapshotSchema,
  getBoardMetadata,
  getChapterTimelineCells,
  getNodeMeta,
  resolveBoardId,
  type EmNodeMeta,
  type EventModelersSnapshot,
} from "./types/snapshot.js";
import type { SliceRef } from "./types/slice-ref.js";
import {
  mapEmField,
  mapScenario,
  type ResolvedElement,
  type ResolvedFlow,
  type ResolvedSliceView,
} from "./types/resolved-view.js";
import { inferSliceType } from "./infer-slice-type.js";
import { stripTypePrefix } from "./prefix.js";
import type { SliceStatus } from "./constants.js";
import { SLICE_STATUS_VALUES } from "./constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getPackageRoot(): string {
  return join(__dirname, "..");
}

export function getRepoRoot(): string {
  return join(getPackageRoot(), "../..");
}

/** Resolve slice dir from repo root when path is relative (CLI cwd is often packages/em-manager). */
export function resolveSliceDirArg(sliceDirArg: string): string {
  if (sliceDirArg.startsWith("/")) return sliceDirArg;

  const repoRoot = getRepoRoot();
  const fromRoot = resolve(repoRoot, sliceDirArg);
  if (existsSync(join(fromRoot, "slice.ref.json"))) return fromRoot;

  const fromSlices = join(repoRoot, "packages/slices/src", sliceDirArg);
  if (existsSync(join(fromSlices, "slice.ref.json"))) return fromSlices;

  return fromRoot;
}

export function resolveMigrationPath(relativeOrAbsolute: string, fromDir?: string): string {
  if (relativeOrAbsolute.startsWith("/")) return relativeOrAbsolute;
  const base = fromDir ?? process.cwd();
  return resolve(base, relativeOrAbsolute);
}

export function loadSnapshot(filePath: string): EventModelersSnapshot {
  const content = readFileSync(filePath, "utf-8");
  const parsed: unknown = JSON.parse(content);
  return eventModelersSnapshotSchema.parse(parsed);
}

function inferAggregate(meta: EmNodeMeta, title: string): string {
  if (meta.aggregate && meta.aggregate !== "None") {
    return meta.aggregate;
  }
  const fields = meta.fields ?? [];
  for (const field of fields) {
    const name = field.name.toLowerCase();
    if (name.endsWith("_id")) {
      const base = name.slice(0, -3);
      if (base) {
        return base.charAt(0).toUpperCase() + base.slice(1);
      }
    }
  }
  const words = title.split(/\s+/);
  return words[words.length - 1] ?? "Aggregate";
}

function metaToElement(
  nodeId: string,
  meta: EmNodeMeta
): ResolvedElement {
  const title = meta.title ?? meta.name ?? nodeId;
  return {
    id: nodeId,
    nodeType: meta.type ?? "UNKNOWN",
    title,
    aggregate: inferAggregate(meta, title),
    context: meta.context as string | undefined,
    fields: (meta.fields ?? []).map(mapEmField),
    rawMeta: meta as Record<string, unknown>,
  };
}

function buildFlow(
  snapshot: EventModelersSnapshot,
  boardId: string,
  chapterId: string,
  columnId: string,
  sliceBorderId: string
): ResolvedFlow {
  const cells = getChapterTimelineCells(snapshot, boardId, chapterId).filter(
    (c) => c.colId === columnId
  );
  const boardMeta = getBoardMetadata(snapshot, boardId);

  const resolvedCells: ResolvedElement[] = [];
  const commands: ResolvedElement[] = [];
  const events: ResolvedElement[] = [];
  const externalEvents: ResolvedElement[] = [];
  const apis: ResolvedElement[] = [];
  const readModels: ResolvedElement[] = [];
  const screens: ResolvedElement[] = [];
  const automations: ResolvedElement[] = [];
  const scenarios: ResolvedSliceView["flows"][0]["scenarios"] = [];

  for (const cell of cells) {
    const meta = boardMeta[cell.nodeId]?.meta;
    if (!meta?.type) continue;

    const element = metaToElement(cell.nodeId, meta);
    resolvedCells.push(element);

    switch (meta.type) {
      case "COMMAND":
        commands.push(element);
        break;
      case "EVENT":
        if (meta.context === "EXTERNAL") externalEvents.push(element);
        else events.push(element);
        break;
      case "API":
        apis.push(element);
        break;
      case "READMODEL":
        readModels.push(element);
        break;
      case "SCREEN":
        screens.push(element);
        break;
      case "AUTOMATION":
        automations.push(element);
        break;
      case "SCENARIO": {
        const scenarioRoot = meta.givenWhenThenScenario?.scenarios ?? [];
        const commandId = commands[0]?.id ?? sliceBorderId;
        for (const s of scenarioRoot) {
          scenarios.push(mapScenario(s, commandId));
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    columnId,
    sliceBorderId,
    cells: resolvedCells,
    commands,
    events,
    externalEvents,
    apis,
    readModels,
    screens,
    automations,
    scenarios,
  };
}

function normalizeSliceStatus(value: string | undefined): SliceStatus {
  if (!value || value.trim() === "") {
    return "Created";
  }
  if ((SLICE_STATUS_VALUES as readonly string[]).includes(value)) {
    return value as SliceStatus;
  }
  return "Created";
}

export function resolveSliceRef(
  ref: SliceRef,
  snapshot: EventModelersSnapshot,
  options?: { allowMissingPrefix?: boolean }
): ResolvedSliceView {
  const { chapterId, sliceBorderIds, columnIds } = ref.sourceRefs;
  const boardId = resolveBoardId(snapshot, ref.sourceRefs);

  if (sliceBorderIds.length !== columnIds.length) {
    throw new Error(
      `sliceBorderIds (${sliceBorderIds.length}) and columnIds (${columnIds.length}) must align per flow`
    );
  }

  const flows: ResolvedFlow[] = columnIds.map((columnId, index) =>
    buildFlow(snapshot, boardId, chapterId, columnId, sliceBorderIds[index]!)
  );

  for (let i = 0; i < sliceBorderIds.length; i++) {
    const borderMeta = getNodeMeta(snapshot, boardId, sliceBorderIds[i]!);
    const borderTitle = borderMeta?.title ?? "";
    const strippedRef = stripTypePrefix(ref.sliceTitle);
    const strippedBorder = stripTypePrefix(borderTitle);
    if (strippedBorder && strippedRef && strippedBorder !== strippedRef) {
      console.warn(
        `Warning: slice border title "${borderTitle}" differs from ref sliceTitle "${ref.sliceTitle}"`
      );
    }
  }

  const sliceType = inferSliceType({
    title: ref.sliceTitle,
    flows,
    explicitType: ref.sliceType,
    allowMissingPrefix: options?.allowMissingPrefix,
  });

  const flowColumnIds = new Set(columnIds);
  const crossSliceInputs: ResolvedElement[] = [];
  for (const spec of flows.flatMap((f) => f.scenarios)) {
    for (const step of spec.given) {
      if (!flowColumnIds.has(step.id)) {
        const meta = getNodeMeta(snapshot, boardId, step.id);
        if (meta) {
          crossSliceInputs.push(metaToElement(step.id, meta));
        }
      }
    }
  }

  const aggregates = [
    ...new Set(
      flows.flatMap((f) =>
        f.cells.map((c) => c.aggregate).filter((a) => a && a !== "Aggregate")
      )
    ),
  ];

  const firstBorderMeta = getNodeMeta(snapshot, boardId, sliceBorderIds[0]!);
  const sliceStatus = ref.sliceStatus ?? normalizeSliceStatus(firstBorderMeta?.sliceStatus as string);

  return {
    title: stripTypePrefix(ref.sliceTitle),
    sliceType,
    sliceStatus,
    permission: ref.permission,
    apiEndpoint: ref.apiEndpoint,
    boardId,
    chapterId,
    pinnedSnapshot: ref.pinnedSnapshot,
    flows,
    crossSliceInputs,
    aggregates,
  };
}

export function loadSnapshotForRef(ref: SliceRef, refFilePath: string): EventModelersSnapshot {
  const snapshotPath = resolveMigrationPath(ref.snapshot, dirname(refFilePath));
  return loadSnapshot(snapshotPath);
}

export function resolveSliceRefFromPath(
  sliceRefPath: string,
  options?: { allowMissingPrefix?: boolean }
): ResolvedSliceView {
  const content = readFileSync(sliceRefPath, "utf-8");
  const ref = JSON.parse(content) as SliceRef;
  const snapshot = loadSnapshotForRef(ref, sliceRefPath);
  return resolveSliceRef(ref, snapshot, options);
}

export function resolveSliceDir(
  sliceDir: string,
  options?: { allowMissingPrefix?: boolean }
): ResolvedSliceView {
  const resolvedDir = resolveSliceDirArg(sliceDir);
  return resolveSliceRefFromPath(join(resolvedDir, "slice.ref.json"), options);
}
