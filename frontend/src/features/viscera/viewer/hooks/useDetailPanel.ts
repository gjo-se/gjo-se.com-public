import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useWorkspace } from '../../core/useWorkspace';
import { useViewState } from '../../hooks/useViewState';
import { generateNodeSummary } from '../../services/nodeSummaryService';
import { useVisceraStore } from '../../store/visceraStore';
import { COPY_FEEDBACK_MS } from '../components/detail-tabs/constants';
import { createMaterializeDerivedDiagramCommand } from '../services/diagramCommands';


import { useRejectedNotice } from './useRejectedNotice';

import type { ObjectDetail } from './useObjectDetail';
import type { WriteResult } from './useYamlWrite';
import type { Workspace } from '../../core/workspaceSchema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseDetailPanelProps {
  /** ID of the selected object (e.g. "backend" or "backend.llmPipeline"). */
  objectId: string | null;
  /** Resolved object detail data (null while loading or if not found). */
  detail: ObjectDetail | null;
  /** Called when the panel should close. */
  onClose: () => void;
}

export interface UseDetailPanelResult {
  // Derived (L3/L4)
  isDerived: boolean;
  handleDerivedFieldSave: (objectId: string, field: string, value: unknown) => Promise<WriteResult>;

  // Generate description (derived, on-demand LLM)
  generatingDescription: boolean;
  canGenerateDescription: boolean;
  handleGenerateDescription: () => Promise<void>;

  // Copy
  copied: boolean;
  handleCopy: () => Promise<void>;

  // Delete
  deleteDialogOpen: boolean;
  deleting: boolean;
  deleteWarning: string;
  handleDeleteClick: () => void;
  handleDeleteConfirm: () => void;
  setDeleteDialogOpen: (open: boolean) => void;

  // Status
  isDeprecated: boolean;
  currentStatus: string;
  statusSaving: boolean;
  handleStatusChange: (newStatus: string) => void;

  // Rejection
  rejectionDialogOpen: boolean;
  rejectionSending: boolean;
  setRejectionDialogOpen: (open: boolean) => void;
  handleRejectionConfirm: (reason: string, promptSuggestion: string) => Promise<void>;

  // Annotations
  newAnnotationText: string;
  editingIndex: number | null;
  editText: string;
  annotationSaving: boolean;
  setNewAnnotationText: (text: string) => void;
  setEditText: (text: string) => void;
  handleAddAnnotation: () => void;
  handleEditAnnotation: (index: number) => void;
  handleSaveEdit: (text: string) => void;
  handleDeleteAnnotation: (index: number) => void;
  handleCancelEdit: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Syncs a node's status into the workspace context so `useObjectDetail` /
 * the details panel reflect the change immediately (mirrors the technology
 * handler). Without this, the sidebar keeps showing the stale status after
 * the optimistic store write.
 */
function syncWorkspaceObjectStatus(
  objectId: string,
  status: string,
  workspace: Workspace | null,
  updateWorkspace: (workspace: Workspace) => void,
): void {
  if (!workspace) return;
  updateWorkspace({
    ...workspace,
    objects: workspace.objects?.map((o) =>
      o.id === objectId ? { ...o, status } : o,
    ),
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Business-logic hook for the ObjectDetailsPanel.
 *
 * Encapsulates all state management, status transitions, delete/rejection flows,
 * annotation CRUD, copy-to-clipboard, and escape-key handling so that the panel
 * component remains a pure composition layer.
 */
export function useDetailPanel({
  objectId,
  detail,
  onClose,
}: UseDetailPanelProps): UseDetailPanelResult {
  const store = useVisceraStore();
  const { sendRejectedNotice } = useRejectedNotice();
  const { workspace, updateWorkspace } = useWorkspace();
  const { currentViewKey } = useViewState();

  const isDerived = detail?.isDerived ?? false;

  // ── Derived (L3/L4) ─────────────────────────────────────────────────────────
  // Curation on diagram level: materialize the ephemeral derived diagram before
  // the first sync, then write via the existing diagram sync paths (#2492).

  const materializeDerivedDiagram = useCallback(() => {
    const derived = useVisceraStore.getState().derivedDiagram;
    if (!derived || !workspace) return;
    createMaterializeDerivedDiagramCommand({ workspace, updateWorkspace, derivedDiagram: derived });
    useVisceraStore.getState().clearDerivedDiagram();
  }, [workspace, updateWorkspace]);

  /**
   * EditableField-compatible save for derived nodes. Only `description` is
   * written — as a `diagram.nodes[<id>].description` override via the `move`
   * dispatcher (x/y = current canvas position, fallback {0,0}). Materializes
   * the diagram first so the sequential `drainQueue` runs create_diagram → move.
   */
  const handleDerivedFieldSave = useCallback(
    (id: string, field: string, value: unknown): Promise<WriteResult> => {
      if (field !== 'description') return Promise.resolve({ success: true });
      return new Promise((resolve) => {
        const description = String(value ?? '');
        const state = useVisceraStore.getState();
        materializeDerivedDiagram();
        const node = state.nodes.find((n) => n.id === id);
        const x = node?.position?.x ?? 0;
        const y = node?.position?.y ?? 0;
        state.queueSync({
          mutationId: crypto.randomUUID(),
          nodeId: id,
          action: 'move',
          payload: { diagramKey: currentViewKey, x, y, description },
          retryCount: 0,
          status: 'pending',
        });
        resolve({ success: true });
      });
    },
    [materializeDerivedDiagram, currentViewKey],
  );

  // ── Generate description (derived, on-demand LLM, #2493) ─────────────────
  // On-demand node description for L3-Component- and L4-File-Nodes: materialize
  // the derived diagram first, generate the LLM summary, then persist it as a
  // `diagram.nodes[<id>].description` override via the `move` dispatcher.
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const canGenerateDescription = isDerived && Boolean(detail && !detail.description.trim());

  const handleGenerateDescription = useCallback(async () => {
    if (!detail?.objectId || generatingDescription) return;
    setGeneratingDescription(true);
    try {
      const nodeId = detail.objectId;
      // Materialize the ephemeral derived diagram before the first sync so the
      // sequential drainQueue runs create_diagram → move (#2492/#2493).
      materializeDerivedDiagram();
      const result = await generateNodeSummary(nodeId);
      if (result.description) {
        const state = useVisceraStore.getState();
        const node = state.nodes.find((n) => n.id === nodeId);
        const x = node?.position?.x ?? 0;
        const y = node?.position?.y ?? 0;
        state.queueSync({
          mutationId: crypto.randomUUID(),
          nodeId,
          action: 'move',
          payload: { diagramKey: currentViewKey, x, y, description: result.description },
          retryCount: 0,
          status: 'pending',
        });
      } else if (result.skipped) {
        toast.error('Beschreibung konnte nicht generiert werden (LLM nicht verfügbar)');
      }
    } catch {
      toast.error('Beschreibung konnte nicht generiert werden (LLM nicht verfügbar)');
    } finally {
      setGeneratingDescription(false);
    }
  }, [detail, generatingDescription, materializeDerivedDiagram, currentViewKey]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.description);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard API not available — silently ignore
    }
  }, [detail]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleting = false;

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!objectId) return;
    store.deleteNode(objectId);
    store.queueSync({
      mutationId: crypto.randomUUID(),
      nodeId: objectId,
      action: 'delete',
      payload: {},
      retryCount: 0,
      status: 'pending',
    });
    setDeleteDialogOpen(false);
    onClose();
  }, [objectId, onClose, store]);

  // ── Status ────────────────────────────────────────────────────────────────
  const statusSaving = false;

  const currentStatus = useMemo(() => {
    if (!detail) return 'viscera-approved';
    const statusField = detail.fields.find((f) => f.field === 'status');
    return typeof statusField?.value === 'string' ? statusField.value : 'viscera-approved';
  }, [detail]);

  const isDeprecated = useMemo(() => {
    if (!detail) return false;
    const statusField = detail.fields.find((f) => f.field === 'status');
    return statusField?.value === 'viscera-deprecated';
  }, [detail]);

  const deleteWarning = useMemo(() => {
    if (!detail) return '';
    if (['viscera-approved', 'viscera-pending'].includes(currentStatus)) {
      return `Objekt „${detail.name}“ ist **${currentStatus}** – wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`;
    }
    return `Objekt „${detail.name}“ endgültig aus workspace.yml entfernen?`;
  }, [detail, currentStatus]);

  // ── Rejection ─────────────────────────────────────────────────────────────
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionSending, setRejectionSending] = useState(false);

  const handleRejectionConfirm = useCallback(
    async (reason: string, promptSuggestion: string) => {
      if (!objectId || !detail) return;
      setRejectionSending(true);
      try {
        // 1. Set status to rejected in store (optimistic)
        store.updateNodeStatus(objectId, 'viscera-rejected');
        syncWorkspaceObjectStatus(objectId, 'viscera-rejected', workspace, updateWorkspace);

        // 2. Add REJECTED annotation (optimistic)
        const annotationText = `REJECTED: ${reason}`;
        store.addAnnotation(objectId, annotationText, 'greg');

        // 3. Send rejection notice to LLM pipeline
        await sendRejectedNotice(detail, reason, promptSuggestion);

        // 4. Close dialog
        setRejectionDialogOpen(false);
      } catch {
        // Error silently handled
      } finally {
        setRejectionSending(false);
      }
    },
    [objectId, detail, sendRejectedNotice, store, workspace, updateWorkspace],
  );

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      if (!objectId) return;

      // Derived: set the Diagram status via update_diagram (materialize first).
      if (detail?.isDerived) {
        materializeDerivedDiagram();
        useVisceraStore.getState().updateDiagramStatus(currentViewKey, newStatus);
        return;
      }

      if (statusSaving) return;

      // Intercept rejected: open dialog instead of immediate write
      if (newStatus === 'viscera-rejected') {
        setRejectionDialogOpen(true);
        return;
      }

      store.updateNodeStatus(objectId, newStatus);
      syncWorkspaceObjectStatus(objectId, newStatus, workspace, updateWorkspace);
    },
    [objectId, statusSaving, store, detail, materializeDerivedDiagram, currentViewKey, workspace, updateWorkspace],
  );

  // ── Annotations ───────────────────────────────────────────────────────────
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const annotationSaving = false;

  const handleAddAnnotation = useCallback(() => {
    if (!objectId || !newAnnotationText.trim()) return;
    store.addAnnotation(objectId, newAnnotationText.trim(), 'greg');
    setNewAnnotationText('');
  }, [objectId, store, newAnnotationText]);

  const handleEditAnnotation = useCallback(
    (index: number) => {
      const annotation = detail?.annotations[index];
      if (!annotation) return;
      setEditingIndex(index);
      setEditText(annotation.text);
    },
    [detail],
  );

  const handleSaveEdit = useCallback(
    (text: string) => {
      if (!objectId || editingIndex === null || !text.trim()) return;
      store.updateAnnotation(objectId, editingIndex, text.trim());
      setEditingIndex(null);
      setEditText('');
    },
    [objectId, editingIndex, store],
  );

  const handleDeleteAnnotation = useCallback(
    (index: number) => {
      if (!objectId) return;
      store.deleteAnnotation(objectId, index);
    },
    [objectId, store],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditText('');
  }, []);

  // ── Escape key listener ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return {
    // Derived (L3/L4)
    isDerived,
    handleDerivedFieldSave,
    // Generate description (derived, on-demand LLM)
    generatingDescription,
    canGenerateDescription,
    handleGenerateDescription,
    // Copy
    copied,
    handleCopy,
    // Delete
    deleteDialogOpen,
    deleting,
    deleteWarning,
    handleDeleteClick,
    handleDeleteConfirm,
    setDeleteDialogOpen,
    // Status
    isDeprecated,
    currentStatus,
    statusSaving,
    handleStatusChange,
    // Rejection
    rejectionDialogOpen,
    rejectionSending,
    setRejectionDialogOpen,
    handleRejectionConfirm,
    // Annotations
    newAnnotationText,
    editingIndex,
    editText,
    annotationSaving,
    setNewAnnotationText,
    setEditText,
    handleAddAnnotation,
    handleEditAnnotation,
    handleSaveEdit,
    handleDeleteAnnotation,
    handleCancelEdit,
  };
}
