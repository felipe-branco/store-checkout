import { z } from "zod";

/** Raw Event Modelers board export (partial — validated at use sites). */
export const eventModelersSnapshotSchema = z
  .object({
    snapshotFormatVersion: z.string().optional(),
    boards: z.record(z.string(), z.object({ name: z.string().optional() }).passthrough()),
    nodes: z.record(z.string(), z.object({ nodes: z.array(z.unknown()) }).passthrough()),
    metadata: z.record(
      z.string(),
      z.record(z.string(), z.object({ meta: z.record(z.string(), z.unknown()).optional() }).passthrough())
    ),
  })
  .passthrough();

export type EventModelersSnapshot = z.infer<typeof eventModelersSnapshotSchema>;

export interface EmNodeMeta {
  type?: string;
  title?: string;
  name?: string;
  sliceStatus?: string;
  fields?: EmField[];
  aggregate?: string | null;
  context?: string;
  givenWhenThenScenario?: {
    scenarios?: EmScenario[];
  };
  [key: string]: unknown;
}

export interface EmField {
  name: string;
  type?: string;
  cardinality?: string;
  optional?: boolean;
  example?: string | object;
  subfields?: EmField[];
  idAttribute?: boolean;
  generated?: boolean;
}

export interface EmScenario {
  id: string;
  title?: string;
  description?: string;
  expectError?: boolean;
  errorDescription?: string;
  expectEmptyList?: boolean;
  given?: EmScenarioStep[];
  when?: EmScenarioStep[];
  then?: EmScenarioStep[];
}

export interface EmScenarioStep {
  id: string;
  title: string;
  type: string;
  fields?: Array<{ name: string; example?: string }>;
}

export interface TimelineCell {
  nodeId: string;
  colId: string;
  rowId?: string;
}

export function resolveBoardId(
  snapshot: EventModelersSnapshot,
  sourceRefs: { boardId: string; chapterId: string; sliceBorderIds: string[] }
): string {
  if (snapshot.metadata[sourceRefs.boardId]) {
    return sourceRefs.boardId;
  }

  const anchorIds = [sourceRefs.chapterId, ...sourceRefs.sliceBorderIds];
  for (const [boardId, boardMeta] of Object.entries(snapshot.metadata)) {
    if (anchorIds.some((id) => boardMeta[id])) {
      return boardId;
    }
  }

  throw new Error(`Board metadata not found: ${sourceRefs.boardId}`);
}

export function getBoardMetadata(
  snapshot: EventModelersSnapshot,
  boardId: string
): Record<string, { meta?: EmNodeMeta }> {
  const boardMeta = snapshot.metadata[boardId];
  if (!boardMeta) {
    throw new Error(`Board metadata not found: ${boardId}`);
  }
  return boardMeta as Record<string, { meta?: EmNodeMeta }>;
}

export function getNodeMeta(
  snapshot: EventModelersSnapshot,
  boardId: string,
  nodeId: string
): EmNodeMeta | undefined {
  return getBoardMetadata(snapshot, boardId)[nodeId]?.meta;
}

export function getChapterTimelineCells(
  snapshot: EventModelersSnapshot,
  boardId: string,
  chapterId: string
): TimelineCell[] {
  const chapterMeta = getNodeMeta(snapshot, boardId, chapterId);
  const timelineData = chapterMeta?.timelineData as
    | { cells?: TimelineCell[] }
    | undefined;
  return timelineData?.cells ?? [];
}
