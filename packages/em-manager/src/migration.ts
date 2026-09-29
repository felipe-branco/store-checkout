import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname, join } from "path";
import { gunzipSync } from "zlib";
import { SNAPSHOT_FORMAT_VERSION } from "./constants.js";
import { getMigrationsDir, readManifest, writeManifest } from "./manifest-io.js";
import { getPackageRoot } from "./resolve-slice-ref.js";
import { sliceRefSchema, type SliceRef } from "./types/slice-ref.js";
import type { EventModelersSnapshot } from "./types/snapshot.js";

export function stampSnapshot(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    snapshotFormatVersion: SNAPSHOT_FORMAT_VERSION,
  };
}

function readExportFile(exportPath: string): string {
  const buffer = readFileSync(exportPath);
  if (exportPath.endsWith(".gz")) {
    return gunzipSync(buffer).toString("utf-8");
  }
  return buffer.toString("utf-8");
}

export function migrationAdd(exportPath: string, slug?: string): string {
  const raw = JSON.parse(readExportFile(exportPath)) as Record<string, unknown>;
  const stamped = stampSnapshot(raw);

  const now = new Date();
  const ts =
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}` +
    `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const name = slug ? `${ts}_${slug}` : `${ts}_export`;
  const outPath = join(getMigrationsDir(), `${name}.json`);
  writeFileSync(outPath, `${JSON.stringify(stamped, null, 2)}\n`, "utf-8");

  const manifest = readManifest();
  manifest.currentSnapshot = name;
  manifest.snapshotFormatVersion = SNAPSHOT_FORMAT_VERSION;
  writeManifest(manifest);

  return name;
}

export function listMigrationIds(): string[] {
  return readdirSync(getMigrationsDir())
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export function loadMigrationById(id: string): EventModelersSnapshot {
  const path = join(getMigrationsDir(), `${id}.json`);
  if (!existsSync(path)) {
    throw new Error(`Migration not found: ${id}`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as EventModelersSnapshot;
}

export interface MigrationDiffRow {
  sliceBorderId: string;
  change: "added" | "removed" | "changed";
  title?: string;
  sliceStatus?: { from?: string; to?: string };
}

export function migrationDiff(fromId?: string, toId?: string): MigrationDiffRow[] {
  const manifest = readManifest();
  const ids = listMigrationIds();
  const to = toId ?? manifest.currentSnapshot;
  const toIndex = ids.indexOf(to);
  if (toIndex < 0) throw new Error(`Migration not found: ${to}`);
  const from = fromId ?? (toIndex > 0 ? ids[toIndex - 1] : undefined);
  if (!from) return [];

  const fromSnap = loadMigrationById(from);
  const toSnap = loadMigrationById(to);
  const boardId = Object.keys(toSnap.metadata)[0]!;
  const fromMeta = fromSnap.metadata[boardId] ?? {};
  const toMeta = toSnap.metadata[boardId] ?? {};

  const fromBorders = collectSliceBorders(fromMeta);
  const toBorders = collectSliceBorders(toMeta);

  const rows: MigrationDiffRow[] = [];
  for (const [id, toRow] of toBorders) {
    if (!fromBorders.has(id)) {
      rows.push({ sliceBorderId: id, change: "added", title: toRow.title, sliceStatus: { to: toRow.sliceStatus } });
    } else {
      const fromRow = fromBorders.get(id)!;
      if (fromRow.title !== toRow.title || fromRow.sliceStatus !== toRow.sliceStatus) {
        rows.push({
          sliceBorderId: id,
          change: "changed",
          title: toRow.title,
          sliceStatus: { from: fromRow.sliceStatus, to: toRow.sliceStatus },
        });
      }
    }
  }
  for (const [id, fromRow] of fromBorders) {
    if (!toBorders.has(id)) {
      rows.push({ sliceBorderId: id, change: "removed", title: fromRow.title });
    }
  }
  return rows;
}

function collectSliceBorders(
  boardMeta: Record<string, unknown>
): Map<string, { title?: string; sliceStatus?: string }> {
  const borders = new Map<string, { title?: string; sliceStatus?: string }>();
  for (const [id, node] of Object.entries(boardMeta)) {
    const meta = (node as { meta?: { type?: string; title?: string; sliceStatus?: string } }).meta;
    if (meta?.type === "SLICE_BORDER") {
      borders.set(id, { title: meta.title, sliceStatus: meta.sliceStatus });
    }
  }
  return borders;
}

export function findAllSliceRefs(): Array<{ ref: SliceRef; path: string }> {
  const repoRoot = join(getPackageRoot(), "../..");
  const slicesDir = join(repoRoot, "packages/slices/src");
  const paths: string[] = [];
  if (existsSync(slicesDir)) {
    walkDir(slicesDir, paths);
  }
  return paths.map((p) => ({
    path: p,
    ref: sliceRefSchema.parse(JSON.parse(readFileSync(p, "utf-8"))),
  }));
}

function walkDir(dir: string, results: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, results);
    else if (entry.name === "slice.ref.json") results.push(full);
  }
}

export function mergeStatusIntoSnapshot(outputSlug?: string): string {
  const manifest = readManifest();
  const current = loadMigrationById(manifest.currentSnapshot);
  const boardId = Object.keys(current.metadata)[0]!;
  const sliceRefs = findAllSliceRefs();

  for (const { ref, path: refPath } of sliceRefs) {
    for (const borderId of ref.sourceRefs.sliceBorderIds) {
      const node = current.metadata[boardId]?.[borderId] as
        | { meta?: Record<string, unknown> }
        | undefined;
      if (node?.meta) {
        node.meta.sliceStatus = ref.sliceStatus;
      }
    }
    const folderName = basename(dirname(refPath));
    manifest.slices[folderName] = {
      pinnedSnapshot: ref.pinnedSnapshot,
      sliceBorderIds: ref.sourceRefs.sliceBorderIds,
      sliceStatus: ref.sliceStatus,
    };
  }

  const outName = outputSlug ?? manifest.currentSnapshot;
  const outPath = join(getMigrationsDir(), `${outName}.json`);
  writeFileSync(outPath, `${JSON.stringify(current, null, 2)}\n`, "utf-8");
  writeManifest(manifest);
  return outName;
}
