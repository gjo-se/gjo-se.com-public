import { useVisceraStore } from '../../store/visceraStore';

import type { ArchitectureObject, Diagram, ViewLayout, ViewType, Workspace } from '../../core/workspaceSchema';
import type { Dispatch, SetStateAction } from 'react';

const DEFAULT_VIEW_KEY = 'SystemContext';

export interface DiagramCommandDependencies {
  workspace: Workspace | null;
  updateWorkspace: (workspace: Workspace) => void;
  currentViewKey: string;
  setViewKey: (key: string) => void;
  setCreateDiagramDialog: Dispatch<SetStateAction<DiagramDialogState>>;
}

export interface DiagramDerivedState {
  diagrams: Diagram[];
  activeDiagram: Diagram | null;
  unassignedCount: number;
}

export interface DiagramDialogState {
  open: boolean;
  isSubmitting: boolean;
  error: string | null;
  editDiagram?: Diagram;
}

export interface DiagramFormData {
  key: string;
  name: string;
  type: string;
  description: string | null;
  parent: string | null;
  layout: string | null;
}

export interface SyncOutcome {
  success: boolean;
  error?: string;
}

/** Creates diagram CRUD handlers with the current workspace dependencies. */
export function createDiagramCommands(deps: DiagramCommandDependencies) {
  const {
    workspace,
    updateWorkspace,
    currentViewKey,
    setViewKey,
    setCreateDiagramDialog,
  } = deps;

  const handleCreateDiagram = () => {
    setCreateDiagramDialog({ open: true, isSubmitting: false, error: null });
  };

  const handleCreateDiagramClose = (open: boolean) => {
    if (!open) {
      setCreateDiagramDialog((previous) => ({
        ...previous,
        open: false,
        error: null,
        editDiagram: undefined,
      }));
    }
  };

  const handleEditDiagram = (key: string) => {
    const diagram = workspace?.diagrams?.find((candidate) => candidate.key === key);
    if (!diagram) return;
    setCreateDiagramDialog({ open: true, isSubmitting: false, error: null, editDiagram: diagram });
  };

  const handleEditDiagramSubmit = async (data: DiagramFormData) => {
    setCreateDiagramDialog((previous) => ({ ...previous, isSubmitting: true, error: null }));
    useVisceraStore.getState().updateDiagram(data.key, {
      name: data.name,
      type: data.type,
      description: data.description,
      layout: data.layout,
    });
    setCreateDiagramDialog({ open: false, isSubmitting: false, error: null, editDiagram: undefined });
  };

  const handleCreateDiagramSubmit = (data: DiagramFormData) => {
    setCreateDiagramDialog((previous) => ({ ...previous, isSubmitting: true, error: null }));

    if (!workspace) {
      setCreateDiagramDialog((previous) => ({
        ...previous,
        isSubmitting: false,
        error: 'Workspace not loaded',
      }));
      return;
    }

    const newDiagram: Diagram = {
      key: data.key,
      name: data.name,
      type: data.type as ViewType,
      description: data.description ?? '',
      parent: data.parent ?? null,
      source: 'code',
      base: null,
      layout: (data.layout as ViewLayout) ?? 'lr',
      nodes: {},
      status: 'pending',
      scan_meta: null,
    };
    updateWorkspace({ ...workspace, diagrams: [...(workspace.diagrams ?? []), newDiagram] });

    useVisceraStore.getState().queueSync({
      mutationId: crypto.randomUUID(),
      nodeId: data.key,
      action: 'create_diagram',
      payload: {
        key: data.key,
        name: data.name,
        type: data.type,
        description: data.description,
        parent: data.parent,
        layout: data.layout,
      },
      retryCount: 0,
      status: 'pending',
    });
    setCreateDiagramDialog({ open: false, isSubmitting: false, error: null });
  };

  const removeDiagram = (key: string) => {
    if (!workspace) return;
    updateWorkspace({
      ...workspace,
      diagrams: (workspace.diagrams ?? []).filter((diagram) => diagram.key !== key),
    });
    useVisceraStore.getState().deleteDiagram(key);
    if (currentViewKey === key) setViewKey(DEFAULT_VIEW_KEY);
  };

  const handleDeleteDiagram = (key: string) => removeDiagram(key);

  return {
    handleCreateDiagram,
    handleCreateDiagramClose,
    handleCreateDiagramSubmit,
    handleEditDiagram,
    handleEditDiagramSubmit,
    removeDiagram,
    handleDeleteDiagram,
  };
}

/** Derives the diagram list, active diagram, and unassigned object count. */
export function createDiagramDerivedState(
  workspace: Workspace | null,
  currentViewKey: string,
  objects: ArchitectureObject[],
): DiagramDerivedState {
  const diagrams = (workspace?.diagrams ?? []) as Diagram[];
  const activeDiagram = diagrams.find((diagram) => diagram.key === currentViewKey) ?? null;
  if (diagrams.length === 0) return { diagrams, activeDiagram, unassignedCount: 0 };

  const assignedIds = new Set(diagrams.flatMap((diagram) => Object.keys(diagram.nodes ?? {})));
  const unassignedCount = objects.filter(
    (object) => object.type !== 'person' && !assignedIds.has(object.id),
  ).length;

  return { diagrams, activeDiagram, unassignedCount };
}

/** Materializes an ephemeral derived diagram on first curation (#2491). */
export function createMaterializeDerivedDiagramCommand(deps: {
  workspace: Workspace;
  updateWorkspace: (workspace: Workspace) => void;
  derivedDiagram: Diagram;
}): void {
  const { workspace, updateWorkspace, derivedDiagram } = deps;

  // Idempotent: bereits materialisiert / persisted vorhanden → nichts tun
  // (Schützt vor Doppel-Queue bei mehreren aufeinanderfolgenden ApplyNodeMove-Calls).
  if ((workspace.diagrams ?? []).some((d) => d.key === derivedDiagram.key)) return;

  updateWorkspace({
    ...workspace,
    diagrams: [...(workspace.diagrams ?? []), derivedDiagram],
  });

  useVisceraStore.getState().queueSync({
    mutationId: crypto.randomUUID(),
    nodeId: derivedDiagram.key,
    action: 'create_diagram',
    payload: {
      key: derivedDiagram.key,
      name: derivedDiagram.name,
      type: derivedDiagram.type,
      description: derivedDiagram.description,
      parent: derivedDiagram.parent,
      layout: derivedDiagram.layout,
    },
    retryCount: 0,
    status: 'pending',
  });
}

/** Adds object IDs to a diagram and queues the persisted node positions. */
export function extendAndPersistDiagramNodes(
  workspace: Workspace,
  updateWorkspace: (workspace: Workspace) => void,
  diagramKey: string,
  objectIds: string[],
): Diagram | null {
  const targetDiagram = (workspace.diagrams ?? []).find((diagram) => diagram.key === diagramKey);
  if (!targetDiagram) return null;

  const extendedNodes: Record<string, { x: number; y: number }> = {
    ...(targetDiagram.nodes ?? {}),
  };
  objectIds.forEach((id) => {
    if (!(id in extendedNodes)) extendedNodes[id] = { x: 0, y: 0 };
  });

  const updatedDiagrams = (workspace.diagrams ?? []).map((diagram) =>
    diagram.key === diagramKey ? { ...diagram, nodes: extendedNodes } : diagram,
  );
  updateWorkspace({ ...workspace, diagrams: updatedDiagrams });
  useVisceraStore.getState().persistLayout(diagramKey, extendedNodes);

  return targetDiagram;
}

/** Resolves when a queued mutation is removed or marked as failed. */
export function waitForSyncOutcome(mutationId: string): Promise<SyncOutcome> {
  return new Promise((resolve) => {
    const unsubscribe = useVisceraStore.subscribe(
      (state) => state.syncQueue,
      (queue) => {
        const entry = queue.find((item) => item.mutationId === mutationId);
        if (!entry) {
          unsubscribe();
          resolve({ success: true });
          return;
        }
        if (entry.status === 'failed') {
          unsubscribe();
          resolve({ success: false, error: entry.error });
        }
      },
      { fireImmediately: true },
    );
  });
}
