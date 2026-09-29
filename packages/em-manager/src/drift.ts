import { readFileSync } from "fs";
import { resolveSliceRef, loadSnapshotForRef } from "./resolve-slice-ref.js";
import { loadMigrationById, findAllSliceRefs } from "./migration.js";
import { readManifest } from "./manifest-io.js";
import { sliceRefSchema } from "./types/slice-ref.js";
import type { ResolvedSliceView } from "./types/resolved-view.js";

export interface DriftIssue {
  sliceDir: string;
  message: string;
}

function fingerprint(view: ResolvedSliceView): string {
  return JSON.stringify({
    title: view.title,
    sliceType: view.sliceType,
    sliceStatus: view.sliceStatus,
    flows: view.flows.map((f) => ({
      columnId: f.columnId,
      commands: f.commands.map((c) => c.title),
      events: f.events.map((e) => e.title),
      scenarios: f.scenarios.map((s) => s.title),
    })),
  });
}

export function checkSliceDrift(sliceRefPath: string): DriftIssue[] {
  const issues: DriftIssue[] = [];
  const ref = sliceRefSchema.parse(JSON.parse(readFileSync(sliceRefPath, "utf-8")));
  const pinned = loadSnapshotForRef(ref, sliceRefPath);
  const manifest = readManifest();
  const current = loadMigrationById(manifest.currentSnapshot);

  const pinnedView = resolveSliceRef(ref, pinned, { allowMissingPrefix: true });
  const currentRef = { ...ref, pinnedSnapshot: manifest.currentSnapshot, snapshot: ref.snapshot.replace(ref.pinnedSnapshot, manifest.currentSnapshot) };
  let currentView: ResolvedSliceView;
  try {
    const currentSnap = loadMigrationById(manifest.currentSnapshot);
    currentView = resolveSliceRef({ ...ref, pinnedSnapshot: manifest.currentSnapshot }, currentSnap, {
      allowMissingPrefix: true,
    });
  } catch (e) {
    issues.push({ sliceDir: sliceRefPath, message: String(e) });
    return issues;
  }

  if (ref.pinnedSnapshot === manifest.currentSnapshot) {
    return issues;
  }

  if (fingerprint(pinnedView) !== fingerprint(currentView)) {
    issues.push({
      sliceDir: sliceRefPath,
      message: `Pinned snapshot ${ref.pinnedSnapshot} differs from current ${manifest.currentSnapshot} — run em:slice:bump`,
    });
  }

  void currentRef;
  void current;
  return issues;
}

export function checkAllDrift(): DriftIssue[] {
  return findAllSliceRefs().flatMap(({ path }) => checkSliceDrift(path));
}
