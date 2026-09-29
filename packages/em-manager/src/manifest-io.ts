import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { manifestSchema, type Manifest } from "./types/slice-ref.js";
import { getPackageRoot } from "./resolve-slice-ref.js";

export function getManifestPath(): string {
  return join(getPackageRoot(), "manifest.json");
}

export function readManifest(): Manifest {
  const content = readFileSync(getManifestPath(), "utf-8");
  return manifestSchema.parse(JSON.parse(content));
}

export function writeManifest(manifest: Manifest): void {
  writeFileSync(getManifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}

export function getMigrationsDir(): string {
  return join(getPackageRoot(), "migrations");
}
