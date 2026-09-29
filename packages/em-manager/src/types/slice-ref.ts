import { z } from "zod";
import { SLICE_STATUS_VALUES } from "../constants.js";

export const sliceStatusSchema = z.enum(SLICE_STATUS_VALUES);

export const sliceTypeSchema = z.enum([
  "STATE_CHANGE",
  "STATE_VIEW",
  "AUTOMATION",
  "TRANSLATOR",
]);

export const sourceRefsSchema = z.object({
  boardId: z.string().uuid(),
  chapterId: z.string().uuid(),
  sliceBorderIds: z.array(z.string().uuid()).min(1),
  columnIds: z.array(z.string().uuid()).min(1),
});

export const sliceRefSchema = z.object({
  snapshotFormatVersion: z.string(),
  snapshot: z.string(),
  pinnedSnapshot: z.string(),
  sourceRefs: sourceRefsSchema,
  sliceTitle: z.string(),
  sliceType: sliceTypeSchema,
  sliceStatus: sliceStatusSchema,
  permission: z.string().optional(),
  apiEndpoint: z.string().optional(),
});

export type SliceRef = z.infer<typeof sliceRefSchema>;

export const manifestSchema = z.object({
  snapshotFormatVersion: z.string().optional(),
  currentSnapshot: z.string(),
  slices: z.record(
    z.string(),
    z.object({
      pinnedSnapshot: z.string(),
      sliceBorderIds: z.array(z.string()),
      sliceStatus: sliceStatusSchema.optional(),
    })
  ),
});

export type Manifest = z.infer<typeof manifestSchema>;
