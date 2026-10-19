import { useVisceraStore } from '../../store/visceraStore';

import { extendAndPersistDiagramNodes } from './diagramCommands';

import type { Workspace } from '../../core/workspaceSchema';
import type { Dispatch, SetStateAction } from 'react';

export interface AssignDiagramDialogState {
  open: boolean;
  isSubmitting: boolean;
  error: string | null;
}

export interface DiagramReviewCommandDependencies {
  workspace: Workspace | null;
  updateWorkspace: (workspace: Workspace) => void;
  currentViewKey: string;
  setAssignDiagramDialog: Dispatch<SetStateAction<AssignDiagramDialogState>>;
  removeDiagram: (key: string) => void;
}

/** Creates diagram review and node-assignment handlers with explicit dependencies. */
export function createDiagramReviewCommands(deps: DiagramReviewCommandDependencies) {
  const {
    workspace,
    updateWorkspace,
    currentViewKey,
    setAssignDiagramDialog,
    removeDiagram,
  } = deps;

  const handleShowUnassigned = () => {
    setAssignDiagramDialog({ open: true, isSubmitting: false, error: null });
  };

  const handleAssignDiagramClose = (open: boolean) => {
    if (!open) {
      setAssignDiagramDialog((previous) => ({ ...previous, open: false, error: null }));
    }
  };

  const assignNodesToDiagram = (objectIds: string[]) => {
    if (!workspace) return;
    extendAndPersistDiagramNodes(workspace, updateWorkspace, currentViewKey, objectIds);
  };

  const handleAssignDiagramSubmit = (objectIds: string[]) => {
    setAssignDiagramDialog((previous) => ({ ...previous, isSubmitting: true, error: null }));
    if (!workspace) {
      setAssignDiagramDialog((previous) => ({
        ...previous,
        isSubmitting: false,
        error: 'Workspace not loaded',
      }));
      return;
    }
    assignNodesToDiagram(objectIds);
    setAssignDiagramDialog({ open: false, isSubmitting: false, error: null });
  };

  const handleAcceptDiagram = (key: string) => {
    if (!workspace) return;
    const updatedDiagrams = (workspace.diagrams ?? []).map((diagram) =>
      diagram.key === key ? { ...diagram, status: 'viscera-approved' } : diagram,
    );
    updateWorkspace({ ...workspace, diagrams: updatedDiagrams });
    useVisceraStore.getState().updateDiagramStatus(key, 'viscera-approved');
  };

  const handleRejectDiagram = (key: string) => {
    removeDiagram(key);
  };

  return {
    handleShowUnassigned,
    handleAssignDiagramClose,
    assignNodesToDiagram,
    handleAssignDiagramSubmit,
    handleAcceptDiagram,
    handleRejectDiagram,
  };
}
