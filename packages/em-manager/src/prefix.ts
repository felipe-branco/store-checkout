import type { SliceType } from "./constants.js";
import { PREFIX_TO_SLICE_TYPE, TYPE_PREFIXES } from "./constants.js";

export function stripTypePrefix(title: string): string {
  const trimmed = title.trim();
  for (const prefix of TYPE_PREFIXES) {
    const re = new RegExp(`^${escapeRegExp(prefix)}\\s*`, "i");
    if (re.test(trimmed)) {
      return trimmed.replace(re, "").trim();
    }
  }
  return trimmed;
}

export function parseTypePrefix(title: string): SliceType | null {
  const trimmed = title.trim();
  for (const prefix of TYPE_PREFIXES) {
    const re = new RegExp(`^${escapeRegExp(prefix)}\\s*`, "i");
    if (re.test(trimmed)) {
      return PREFIX_TO_SLICE_TYPE[prefix];
    }
  }
  return null;
}

export function requireTypePrefix(title: string): SliceType {
  const prefixType = parseTypePrefix(title);
  if (!prefixType) {
    throw new Error(
      `Slice title must start with [SC], [SV], [AUT], or [TR]: "${title}"`
    );
  }
  return prefixType;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toPascalCase(title: string): string {
  return stripTypePrefix(title)
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}
