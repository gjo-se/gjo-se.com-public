import { useVisceraStore } from '../../store/visceraStore';

import type { Dispatch, SetStateAction } from 'react';

// ── Delete Confirmation Dialog ──────────────────────────────────────────

export interface DeleteCommandDependencies {
  deleteDialog: DeleteDialogState;
  setDeleteDialog: Dispatch<SetStateAction<DeleteDialogState>>;
  setObjectId: (id: string | null) => void;
}

export interface DeleteDialogState {
  open: boolean;
  nodes: { id: string; name: string }[];
  edges: { id: string }[];
  deleting: boolean;
}

/** Creates delete-confirmation handlers with the current dialog state and dependencies. */
export function createDeleteCommands(deps: DeleteCommandDependencies) {
  const {
    deleteDialog,
    setDeleteDialog,
    setObjectId,
  } = deps;

  const handleDeleteSelectedElements = () => {
    const store = useVisceraStore.getState();
    const selectedNodes = store.selectedNodes;
    const selectedEdges = store.selectedEdges;

    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    setDeleteDialog({ open: true, nodes: selectedNodes, edges: selectedEdges, deleting: false });
  };

  const handleDeleteConfirm = async () => {
    const nodeList = deleteDialog.nodes;
    const edgeList = deleteDialog.edges;
    setDeleteDialog((prev) => ({ ...prev, deleting: true }));

    const store = useVisceraStore.getState();

    // Optimistic: remove nodes from canvas immediately
    nodeList.forEach((node) => {
      store.deleteNode(node.id);
      store.queueSync({
        mutationId: crypto.randomUUID(),
        nodeId: node.id,
        action: 'delete',
        payload: {},
        retryCount: 0,
        status: 'pending',
      });
    });

      // Optimistic: remove edges from canvas immediately, queue edge deletion
    edgeList.forEach((edge) => {
      store.deleteEdge(edge.id);
      store.queueSync({
        mutationId: crypto.randomUUID(),
        nodeId: edge.id,
        action: 'delete_edge',
        payload: {},
        retryCount: 0,
        status: 'pending',
      });
    });

    setDeleteDialog({ open: false, nodes: [], edges: [], deleting: false });
    // Close detail panel if a deleted node was selected
    setObjectId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, nodes: [], edges: [], deleting: false });
  };

  return {
    handleDeleteSelectedElements,
    handleDeleteConfirm,
    handleDeleteCancel,
  };
}
