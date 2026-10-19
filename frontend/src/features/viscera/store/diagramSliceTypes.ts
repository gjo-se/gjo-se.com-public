import type { OverridePosition } from '../core/nodeOverrides';

// ── Diagram Node Types ────────────────────────────────────────────────────────

/** Union type for all card node data variants (systemCard, containerCard, personCard). */
type CardNodeData = Record<string, unknown>;

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  /** Optional React Flow edge type – L4 uses the built-in `straight` (gerade Kanten). */
  type?: 'straight';
  data?: Record<string, unknown>;
}

export interface DiagramNode {
  id: string;
  type: DiagramNodeType;
  data: CardNodeData;
  position: { x: number; y: number };
  isTransient: boolean;
}

// ── Diagram Edge Types ────────────────────────────────────────────────────────

type DiagramNodeType =
  | 'systemCard'
  | 'containerCard'
  | 'personCard'
  | 'group'
  | 'file'
  | 'sqlTableCard';

export interface DiagramSlice {
  /** Diagram nodes including transient optimistic nodes. */
  nodes: DiagramNode[];
  /** Diagram edges. */
  edges: DiagramEdge[];
  /** Node position overrides from manual drag, keyed by `${diagramKey}:${nodeId}` (#2229). */
  nodeOverrides: Record<string, OverridePosition>;
  /** Sync queue for pending mutations to be flushed to the backend. */
  syncQueue: SyncQueueEntry[];

  /** Replaces the entire nodes array (initial hydrate from workspace). */
  setNodes: (nodes: DiagramNode[]) => void;
  /** Replaces the entire edges array (initial hydrate from workspace). */
  setEdges: (edges: DiagramEdge[]) => void;
  /** Adds a new node with isTransient: true. Sync entry must be queued separately via queueSync. */
  addNode: (node: DiagramNode) => void;
  /** Updates the data field of an existing node by nodeId. */
  updateNode: (nodeId: string, data: CardNodeData) => void;
  /**
   * Removes a node from nodes, all per-diagram position overrides for this node,
   * and all associated sync queue entries.
   */
  deleteNode: (nodeId: string) => void;
  /**
   * Updates a node's position and stores the override per diagram. Queues a 'move' sync entry.
   * Optional bounds (width/height) are persisted for group nodes (#2293).
   */
  moveNode: (nodeId: string, position: OverridePosition, diagramKey: string, bounds?: NodeBounds) => void;
  /** Enqueues a sync entry with status: 'pending' and retryCount: 0. */
  queueSync: (entry: SyncQueueEntry) => void;
  /** Removes a sync queue entry by its mutationId. */
  removeFromQueue: (mutationId: string) => void;
  /** Marks a node as no longer transient (persisted to backend). */
  clearTransient: (nodeId: string) => void;
  /** Updates a sync queue entry (e.g. increment retryCount, set status to failed). */
  updateSyncEntry: (mutationId: string, patch: Partial<Pick<SyncQueueEntry, 'retryCount' | 'status' | 'error'>>) => void;
  /** Adds a diagram edge (no auto-queue). Sync entry must be queued separately via queueSync. */
  addEdge: (edge: DiagramEdge) => void;
  /** Removes an edge and clears its sync queue entries. */
  deleteEdge: (edgeId: string) => void;

  // ── Field-Level Mutations (Foundation #2200) ─────────────────────────────

  /** Updates a node's status field and queues a status_change sync entry. */
  updateNodeStatus: (nodeId: string, status: string) => void;
  /** Updates a node's tags field and queues a tags_change sync entry. */
  updateNodeTags: (nodeId: string, tags: unknown[]) => void;
  /** Updates a node's technologies field and queues a tech_change sync entry. */
  updateNodeTechnologies: (nodeId: string, technologies: unknown[]) => void;
  /** Adds an annotation to a node and queues an annotation_add sync entry. */
  addAnnotation: (nodeId: string, text: string, author: string) => void;
  /** Updates an existing annotation at the given index and queues an annotation_update sync entry. */
  updateAnnotation: (nodeId: string, index: number, text: string) => void;
  /** Removes an annotation at the given index and queues an annotation_delete sync entry. */
  deleteAnnotation: (nodeId: string, index: number) => void;
  /** Generic field update on a node's data — queues a field_update sync entry. */
  updateNodeField: (nodeId: string, field: string, value: unknown) => void;
  /**
   * Persists ELK-computed node positions as a batch into the diagram YAML nodes map (#2232).
   * Group entries may include bounds (width/height, #2293).
   */
  persistLayout: (
    diagramKey: string,
    positions: Record<string, { x: number; y: number; width?: number; height?: number }>,
  ) => void;
  /** Enqueues a diagram metadata update (name, description, type, layout) for async persistence (#2253). */
  updateDiagram: (diagramKey: string, payload: Record<string, unknown>) => void;
  /** Enqueues a diagram status update (accept: 'approved') for async persistence (#2263). */
  updateDiagramStatus: (diagramKey: string, status: string) => void;
  /** Enqueues a diagram deletion for async persistence (#2263). */
  deleteDiagram: (diagramKey: string) => void;
}

/** Optional node dimensions — attached to 'move' payloads for group nodes (#2293). */
export interface NodeBounds {
  width?: number;
  height?: number;
}

// ── Sync Queue Types ──────────────────────────────────────────────────────────

export type SyncAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'move'
  | 'create_edge'
  | 'delete_edge'
  | 'update_edge'
  | 'create_diagram'
  | 'delete_diagram'
  | 'update_diagram'
  | 'status_change'
  | 'tags_change'
  | 'tech_change'
  | 'annotation_add'
  | 'annotation_update'
  | 'annotation_delete'
  | 'field_update'
  | 'persist_layout'
  | 'group_members'
  | 'create_group'
  | 'update_group'
  | 'delete_group';

export interface SyncQueueEntry {
  mutationId: string;
  nodeId: string;
  action: SyncAction;
  payload: Record<string, unknown>;
  retryCount: number;
  status: SyncStatus;
  /** Error message of the last attempt — set by useSyncService on final failure. */
  error?: string;
}

type SyncStatus = 'pending' | 'retrying' | 'failed';
