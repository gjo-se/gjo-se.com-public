import { getCardKind, NODE_TYPE_BY_KIND } from '../../core/cardKindRegistry';
import { useVisceraStore } from '../../store/visceraStore';
import { autoGenerateId } from '../utils/autoGenerateId';

import type { ModelObjectType } from '../../core/workspaceSchema';
import type { CardKind } from '../utils/cardShape';
import type { Dispatch, SetStateAction } from 'react';

export interface CreateObjectDialogState {
  open: boolean;
  prefill: { parent?: string; type?: string } | undefined;
  isSubmitting: boolean;
  error: string | null;
}

export interface CreateObjectFormData {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  parent?: string;
}

export interface ObjectCommandDependencies {
  setCreateObjectDialog: Dispatch<SetStateAction<CreateObjectDialogState>>;
  setObjectId: (id: string | null) => void;
}

// ── Command Factory ─────────────────────────────────────────────────────

/** Creates object CRUD, placeholder, and create-dialog handlers with explicit dependencies. */
export function createObjectCommands(deps: ObjectCommandDependencies) {
  const {
    setCreateObjectDialog,
    setObjectId,
  } = deps;

  const handleCreateObject = () => {
    setCreateObjectDialog({ open: true, prefill: undefined, isSubmitting: false, error: null });
  };

  const handleCreateContainer = (systemId: string) => {
    setCreateObjectDialog({
      open: true,
      prefill: { parent: systemId, type: 'Container' },
      isSubmitting: false,
      error: null,
    });
  };

  const handleCreateComponent = (containerId: string) => {
    setCreateObjectDialog({
      open: true,
      prefill: { parent: containerId, type: 'Component' },
      isSubmitting: false,
      error: null,
    });
  };

  const handleCreateObjectClose = (open: boolean) => {
    if (!open) setCreateObjectDialog((prev) => ({ ...prev, open: false, error: null }));
  };

  const handleCreateObjectSubmit = async (data: CreateObjectFormData) => {
    setCreateObjectDialog((prev) => ({ ...prev, isSubmitting: true, error: null }));

    const modelType: ModelObjectType = (data.type?.toLowerCase() as ModelObjectType) || 'system';
    const cardKind = getCardKind(modelType);
    const store = useVisceraStore.getState();

    // Optimistic: add node to diagramSlice (canvas shows it immediately)
    store.addNode({
      id: data.id,
      type: NODE_TYPE_BY_KIND[cardKind],
      data: {
        name: data.name,
        description: data.description,
        kind: cardKind,
      },
      position: { x: 0, y: 0 },
      isTransient: true,
    });

    // Enqueue API sync (fire-and-forget, processed by useSyncService)
    store.queueSync({
      mutationId: crypto.randomUUID(),
      nodeId: data.id,
      action: 'create',
      payload: {
        id: data.id,
        name: data.name,
        type: data.type,
        description: data.description,
        parent: data.parent,
      },
      retryCount: 0,
      status: 'pending',
    });

    setCreateObjectDialog({ open: false, prefill: undefined, isSubmitting: false, error: null });
    setObjectId(null);
  };

  /**
   * Called when the user confirms the name in the placeholder node (Enter key).
   * Generates an auto ID from the name, calls the API, and handles errors.
   * On 409 (duplicate ID), retries once with a "-2" suffix.
   * When `sourceNodeId` is provided (edge-drop scenario), also creates a
   * edge from source to the new object.
   * Returns the created object data on success, or null on error.
   */
  const handleConfirmPlaceholder = async (
    tempId: string,
    name: string,
    opts?: { sourceNodeId?: string },
  ): Promise<Record<string, unknown> | null> => {
    const optimisticNode = useVisceraStore.getState().pendingOptimisticNodes[tempId];
    if (!optimisticNode) {
      console.error('[confirmPlaceholder] No optimistic node found for tempId:', tempId);
      return null;
    }

    const generatedId = autoGenerateId(name);
    const store = useVisceraStore.getState();
    const cardKind = getCardKind(optimisticNode.type);

    // Optimistic: add node to diagramSlice (canvas shows it immediately)
    store.addNode({
      id: generatedId,
      type: NODE_TYPE_BY_KIND[cardKind],
      data: { name, kind: cardKind },
      position: optimisticNode.position,
      isTransient: true,
    });

    // Enqueue API sync (fire-and-forget, processed by useSyncService)
    store.queueSync({
      mutationId: crypto.randomUUID(),
      nodeId: generatedId,
      action: 'create',
      payload: { id: generatedId, name, type: optimisticNode.type },
      retryCount: 0,
      status: 'pending',
    });

    // Edge-drop: optimistic edge + sync
    if (opts?.sourceNodeId) {
      const edgeId = `${opts.sourceNodeId}__${generatedId}`;
      store.addEdge({
        id: edgeId,
        source: opts.sourceNodeId,
        target: generatedId,
      });
      store.queueSync({
        mutationId: crypto.randomUUID(),
        nodeId: `${opts.sourceNodeId}__${generatedId}`,
        action: 'create_edge',
        payload: { from_id: opts.sourceNodeId, to_id: generatedId },
        retryCount: 0,
        status: 'pending',
      });
    }

    store.removeOptimisticNode(tempId);
    store.removeTempEdge(tempId);
    return { id: generatedId, name };
  };

  /**
   * Called when the user cancels the placeholder node (Escape or × button).
   * Cleans up the optimistic node and any associated temp edge from the store.
   * The node itself is removed from the canvas by AddNodeOverlay's onCancel wrapper.
   */
  const handleCancelPlaceholder = (tempId: string) => {
    useVisceraStore.getState().removeOptimisticNode(tempId);
    useVisceraStore.getState().removeTempEdge(tempId);
  };

  return {
    handleCreateObject,
    handleCreateContainer,
    handleCreateComponent,
    handleCreateObjectClose,
    handleCreateObjectSubmit,
    handleConfirmPlaceholder,
    handleCancelPlaceholder,
  };
}

// ── Kind Mappings ───────────────────────────────────────────────────────

/**
 * Determines the child node type based on the source node's kind.
 *
 * - System → Container
 * - Container → Component
 * - Component → Component (peer)
 * - Person → System (person interacts with systems)
 */
export function getChildType(kind: CardKind): ModelObjectType {
  switch (kind) {
    case 'system': return 'container';
    case 'container': return 'component';
    case 'component': return 'component';
    case 'person': return 'system';
    default: return 'container';
  }
}
