export type ManualRebuildConfig = {
  collectionName: string;
  canHandle: string[];
  evolve: (state: unknown, event: { type: string; data?: unknown }) => unknown;
  getDocumentId?: (event: { type: string; data?: unknown }) => string | undefined;
};

export const MANUAL_REBUILD_CONFIG: Record<string, ManualRebuildConfig> = {};
