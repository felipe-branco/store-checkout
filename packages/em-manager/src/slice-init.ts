import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, relative } from "path";
import { SNAPSHOT_FORMAT_VERSION } from "./constants.js";
import { inferSliceType } from "./infer-slice-type.js";
import { readManifest, getMigrationsDir } from "./manifest-io.js";
import { loadMigrationById } from "./migration.js";
import { getPackageRoot, resolveSliceRef } from "./resolve-slice-ref.js";
import { requireTypePrefix, stripTypePrefix, toPascalCase } from "./prefix.js";
import type { SliceRef } from "./types/slice-ref.js";
import type { EventModelersSnapshot } from "./types/snapshot.js";
import { getBoardMetadata } from "./types/snapshot.js";
import type { SliceStatus } from "./constants.js";

export interface PlannedSliceCandidate {
  sliceBorderId: string;
  columnId: string;
  chapterId: string;
  boardId: string;
  title: string;
  sliceStatus: SliceStatus;
}

export function listPlannedSlices(snapshot: EventModelersSnapshot): PlannedSliceCandidate[] {
  const boardId = Object.keys(snapshot.metadata)[0]!;
  const boardMeta = getBoardMetadata(snapshot, boardId);
  const nodes = snapshot.nodes[boardId]?.nodes as
    | Array<{ id: string; data?: { colId?: string; type?: string; title?: string } }>
    | undefined;

  const colByBorder = new Map<string, string>();
  for (const node of nodes ?? []) {
    if (node.data?.type === "SLICE_BORDER" && node.data.colId) {
      colByBorder.set(node.id, node.data.colId);
    }
  }

  const results: PlannedSliceCandidate[] = [];
  for (const [nodeId, node] of Object.entries(boardMeta)) {
    const meta = node.meta;
    if (meta?.type !== "SLICE_BORDER") continue;
    const status = (meta.sliceStatus as SliceStatus | undefined) ?? "Created";
    if (status !== "Planned" && status !== "Created") continue;

    const title = meta.title ?? nodeId;
    try {
      requireTypePrefix(title);
    } catch {
      continue;
    }

    const chapterId = findChapterForBorder(snapshot, boardId, nodeId);
    if (!chapterId) continue;

    results.push({
      sliceBorderId: nodeId,
      columnId: colByBorder.get(nodeId) ?? meta.colId as string ?? nodeId,
      chapterId,
      boardId,
      title,
      sliceStatus: status === "Created" ? "Created" : "Planned",
    });
  }
  return results;
}

function findChapterForBorder(
  snapshot: EventModelersSnapshot,
  boardId: string,
  borderId: string
): string | undefined {
  const nodes = snapshot.nodes[boardId]?.nodes as Array<{ id: string; parentId?: string }> | undefined;
  const borderNode = nodes?.find((n) => n.id === borderId);
  let parentId = borderNode?.parentId;
  const boardMeta = getBoardMetadata(snapshot, boardId);
  while (parentId) {
    if (boardMeta[parentId]?.meta?.type === "CHAPTER") return parentId;
    const parent = nodes?.find((n) => n.id === parentId);
    parentId = parent?.parentId;
  }
  return undefined;
}

export function groupPlannedCandidates(
  candidates: PlannedSliceCandidate[]
): PlannedSliceCandidate[][] {
  const groups = new Map<string, PlannedSliceCandidate[]>();
  for (const c of candidates) {
    const key = `${c.chapterId}::${stripTypePrefix(c.title).toLowerCase()}::${requireTypePrefix(c.title)}`;
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }
  return [...groups.values()];
}

function relativeSnapshotPath(fromSliceDir: string, snapshotId: string): string {
  const abs = join(getMigrationsDir(), `${snapshotId}.json`);
  return relative(fromSliceDir, abs);
}

export function buildSliceRef(
  group: PlannedSliceCandidate[],
  snapshotId: string,
  sliceDir: string
): SliceRef {
  const first = group[0]!;
  const flows = group.map((g) => ({ columnId: g.columnId, sliceBorderId: g.sliceBorderId }));
  const snapshot = loadMigrationById(snapshotId);
  const draft: SliceRef = {
    snapshotFormatVersion: SNAPSHOT_FORMAT_VERSION,
    snapshot: relativeSnapshotPath(sliceDir, snapshotId),
    pinnedSnapshot: snapshotId,
    sourceRefs: {
      boardId: first.boardId,
      chapterId: first.chapterId,
      sliceBorderIds: flows.map((f) => f.sliceBorderId),
      columnIds: flows.map((f) => f.columnId),
    },
    sliceTitle: stripTypePrefix(first.title),
    sliceType: requireTypePrefix(first.title),
    sliceStatus: first.sliceStatus,
  };

  const resolved = resolveSliceRef(
    { ...draft, sliceTitle: first.title },
    snapshot
  );
  draft.sliceType = inferSliceType({
    title: first.title,
    flows: resolved.flows,
    explicitType: draft.sliceType,
  });
  draft.sliceTitle = stripTypePrefix(first.title);
  return draft;
}

export function initSlice(
  titleOrDir: string,
  options?: { snapshotId?: string; allPlanned?: boolean; slicesRoot?: string }
): string[] {
  const manifest = readManifest();
  const snapshotId = options?.snapshotId ?? manifest.currentSnapshot;
  const snapshot = loadMigrationById(snapshotId);
  const repoRoot = join(getPackageRoot(), "../..");
  const slicesRoot = options?.slicesRoot ?? join(repoRoot, "packages/slices/src");
  const created: string[] = [];

  if (options?.allPlanned) {
    const planned = listPlannedSlices(snapshot);
    const groups = groupPlannedCandidates(planned.filter((p) => p.sliceStatus === "Planned"));
    for (const group of groups) {
      const folderName = toPascalCase(group[0]!.title);
      const sliceDir = join(slicesRoot, folderName);
      const refPath = join(sliceDir, "slice.ref.json");
      if (existsSync(refPath)) continue;
      mkdirSync(sliceDir, { recursive: true });
      const ref = buildSliceRef(group, snapshotId, sliceDir);
      writeFileSync(refPath, `${JSON.stringify(ref, null, 2)}\n`, "utf-8");
      created.push(refPath);
    }
    return created;
  }

  const candidates = listPlannedSlices(snapshot);
  const match = candidates.find(
    (c) =>
      stripTypePrefix(c.title).toLowerCase() === stripTypePrefix(titleOrDir).toLowerCase() ||
      toPascalCase(c.title) === titleOrDir
  );
  if (!match) {
    throw new Error(`Planned slice not found in snapshot: ${titleOrDir}`);
  }

  const group = candidates.filter(
    (c) =>
      c.chapterId === match.chapterId &&
      stripTypePrefix(c.title).toLowerCase() === stripTypePrefix(match.title).toLowerCase()
  );
  const folderName = options?.allPlanned ? titleOrDir : toPascalCase(match.title);
  const sliceDir = join(slicesRoot, folderName);
  mkdirSync(sliceDir, { recursive: true });
  const refPath = join(sliceDir, "slice.ref.json");
  const ref = buildSliceRef(group.length ? group : [match], snapshotId, sliceDir);
  writeFileSync(refPath, `${JSON.stringify(ref, null, 2)}\n`, "utf-8");
  created.push(refPath);
  return created;
}

export function bumpSliceRef(sliceRefPath: string, snapshotId?: string): SliceRef {
  const manifest = readManifest();
  const targetId = snapshotId ?? manifest.currentSnapshot;
  const ref = JSON.parse(readFileSync(sliceRefPath, "utf-8")) as SliceRef;
  const snapshot = loadMigrationById(targetId);
  const sliceDir = dirname(sliceRefPath);

  ref.pinnedSnapshot = targetId;
  ref.snapshot = relativeSnapshotPath(sliceDir, targetId);
  ref.snapshotFormatVersion = SNAPSHOT_FORMAT_VERSION;

  const resolved = resolveSliceRef({ ...ref, sliceTitle: ref.sliceTitle }, snapshot, {
    allowMissingPrefix: true,
  });
  ref.sliceType = resolved.sliceType;
  ref.sliceStatus = resolved.sliceStatus;

  writeFileSync(sliceRefPath, `${JSON.stringify(ref, null, 2)}\n`, "utf-8");
  return ref;
}

export function markSliceStatus(sliceRefPath: string, status: SliceStatus): void {
  const ref = JSON.parse(readFileSync(sliceRefPath, "utf-8")) as SliceRef;
  ref.sliceStatus = status;
  writeFileSync(sliceRefPath, `${JSON.stringify(ref, null, 2)}\n`, "utf-8");
}
