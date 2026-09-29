export { SNAPSHOT_FORMAT_VERSION, SLICE_STATUS_VALUES, TYPE_PREFIXES } from "./constants.js";
export type { SliceStatus, SliceType } from "./constants.js";

export { sliceRefSchema, manifestSchema } from "./types/slice-ref.js";
export type { SliceRef, Manifest } from "./types/slice-ref.js";

export type {
  EventModelersSnapshot,
  EmNodeMeta,
  EmField,
  EmScenario,
} from "./types/snapshot.js";

export type {
  ResolvedSliceView,
  ResolvedFlow,
  ResolvedElement,
  ResolvedSpecification,
  ResolvedField,
} from "./types/resolved-view.js";

export {
  stripTypePrefix,
  parseTypePrefix,
  requireTypePrefix,
  toPascalCase,
} from "./prefix.js";

export { inferSliceType } from "./infer-slice-type.js";

export {
  resolveSliceRef,
  resolveSliceRefFromPath,
  resolveSliceDir,
  loadSnapshot,
  loadSnapshotForRef,
  getPackageRoot,
} from "./resolve-slice-ref.js";

export {
  migrationAdd,
  migrationDiff,
  mergeStatusIntoSnapshot,
  listMigrationIds,
  loadMigrationById,
  findAllSliceRefs,
} from "./migration.js";

export { readManifest, writeManifest, getMigrationsDir } from "./manifest-io.js";

export { checkSliceDrift, checkAllDrift } from "./drift.js";

export {
  initSlice,
  bumpSliceRef,
  markSliceStatus,
  listPlannedSlices,
  buildSliceRef,
} from "./slice-init.js";
