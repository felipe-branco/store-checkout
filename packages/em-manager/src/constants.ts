export const SNAPSHOT_FORMAT_VERSION = "1.0.0";

export const TYPE_PREFIXES = ["[SC]", "[SV]", "[AUT]", "[TR]"] as const;

export type TypePrefix = (typeof TYPE_PREFIXES)[number];

export const PREFIX_TO_SLICE_TYPE = {
  "[SC]": "STATE_CHANGE",
  "[SV]": "STATE_VIEW",
  "[AUT]": "AUTOMATION",
  "[TR]": "TRANSLATOR",
} as const;

export const SLICE_STATUS_VALUES = [
  "Created",
  "Planned",
  "InProgress",
  "Review",
  "Done",
  "Blocked",
  "Assigned",
  "Informational",
] as const;

export type SliceStatus = (typeof SLICE_STATUS_VALUES)[number];

export type SliceType = "STATE_CHANGE" | "STATE_VIEW" | "AUTOMATION" | "TRANSLATOR";
