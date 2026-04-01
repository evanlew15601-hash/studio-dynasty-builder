export type ModOp = 'insert' | 'update' | 'delete';

export interface ModInfo {
  id: string;
  name: string;
  version: string;
  author?: string;
  enabled: boolean;
  /**
   * Higher priority mods are applied later (they win conflicts).
   * Defaults to 0.
   */
  priority?: number;
}

export interface ModPatch {
  id: string;
  modId: string;
  entityType: string;
  op: ModOp;
  /**
   * For update/delete, identifies the target entity (usually an id).
   * For record-style patches, identifies the key.
   */
  target?: string;
  /**
   * For insert/update operations.
   * - For list-style entities: typically a partial object (update) or full object (insert)
   * - For record-style entities: typically the full value to set at `target`
   */
  payload?: unknown;
}

export interface ModBundle {
  version: 1;
  mods: ModInfo[];
  patches: ModPatch[];
}
