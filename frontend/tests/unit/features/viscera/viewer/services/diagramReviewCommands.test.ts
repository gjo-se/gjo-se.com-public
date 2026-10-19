/**
 * Tests: diagramReviewCommands
 *
 * Behaviour: assign-dialog lifecycle, node assignment into the current
 * diagram (optimistic + persist), approval status update with sync entry and
 * rejection delegation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDiagramReviewCommands } from '@src/features/viscera/viewer/services/diagramReviewCommands';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeDiagram, makeWorkspace, resetVisceraStore } from '../../helpers';

import type { AssignDiagramDialogState } from '@src/features/viscera/viewer/services/diagramReviewCommands';
import type { Dispatch, SetStateAction } from 'react';

const store = () => useVisceraStore.getState();

const CLOSED: AssignDiagramDialogState = { open: false, isSubmitting: false, error: null };

function makeSetter(initial: AssignDiagramDialogState) {
  let current = initial;
  const setter: Dispatch<SetStateAction<AssignDiagramDialogState>> = (next) => {
    current = typeof next === 'function' ? next(current) : next;
  };
  return { get: () => current, set: setter };
}

function makeCommands(patch: {
  workspace?: ReturnType<typeof makeWorkspace> | null;
  currentViewKey?: string;
} = {}) {
  const dialog = makeSetter(CLOSED);
  const updateWorkspace = vi.fn();
  const removeDiagram = vi.fn();
  const commands = createDiagramReviewCommands({
    workspace: patch.workspace === undefined ? makeWorkspace() : patch.workspace,
    updateWorkspace,
    currentViewKey: patch.currentViewKey ?? 'container-app',
    setAssignDiagramDialog: dialog.set,
    removeDiagram,
  });
  return { commands, dialog, updateWorkspace, removeDiagram };
}

beforeEach(() => {
  resetVisceraStore();
});

describe('createDiagramReviewCommands – dialog', () => {
  it('opens the unassigned dialog', () => {
    const { commands, dialog } = makeCommands();

    commands.handleShowUnassigned();

    expect(dialog.get()).toEqual({ open: true, isSubmitting: false, error: null });
  });

  it('closes and clears the error', () => {
    const { commands, dialog } = makeCommands();
    dialog.set({ open: true, isSubmitting: false, error: 'x' });

    commands.handleAssignDiagramClose(false);

    expect(dialog.get()).toEqual({ open: false, isSubmitting: false, error: null });
  });

  it('ignores a close(true) request', () => {
    const { commands, dialog } = makeCommands();

    commands.handleAssignDiagramClose(true);

    expect(dialog.get().open).toBe(false);
  });
});

describe('createDiagramReviewCommands – assignment', () => {
  it('assigns nodes to the current diagram and persists them', () => {
    const workspace = makeWorkspace({
      diagrams: [makeDiagram({ key: 'container-app', nodes: { api: { x: 1, y: 2 } } })],
    });
    const { commands, updateWorkspace } = makeCommands({ workspace });

    commands.handleAssignDiagramSubmit(['api', 'db']);

    expect(updateWorkspace.mock.calls[0]?.[0].diagrams[0].nodes).toEqual({
      api: { x: 1, y: 2 },
      db: { x: 0, y: 0 },
    });
    expect(store().syncQueue[0]).toMatchObject({ action: 'persist_layout', nodeId: 'container-app' });
  });

  it('reports an error and assigns nothing without a workspace', () => {
    const { commands, dialog, updateWorkspace } = makeCommands({ workspace: null });
    dialog.set({ open: true, isSubmitting: false, error: null });

    commands.handleAssignDiagramSubmit(['api']);

    expect(updateWorkspace).not.toHaveBeenCalled();
    expect(dialog.get()).toEqual({
      open: true,
      isSubmitting: false,
      error: 'Workspace not loaded',
    });
  });

  it('closes the dialog after a successful assignment', () => {
    const { commands, dialog } = makeCommands();

    commands.handleAssignDiagramSubmit([]);

    expect(dialog.get()).toEqual(CLOSED);
  });
});

describe('createDiagramReviewCommands – approval', () => {
  it('marks the diagram approved in the workspace and queues the status update', () => {
    const workspace = makeWorkspace({
      diagrams: [
        makeDiagram({ key: 'a', status: 'viscera-pending' }),
        makeDiagram({ key: 'b', status: 'viscera-pending' }),
      ],
    });
    const { commands, updateWorkspace } = makeCommands({ workspace });

    commands.handleAcceptDiagram('a');

    expect(updateWorkspace.mock.calls[0]?.[0].diagrams[0].status).toBe('viscera-approved');
    expect(updateWorkspace.mock.calls[0]?.[0].diagrams[1].status).toBe('viscera-pending');
    expect(store().syncQueue[0]).toMatchObject({
      nodeId: 'a',
      action: 'update_diagram',
      payload: { key: 'a', status: 'viscera-approved' },
    });
  });

  it('does nothing without a workspace', () => {
    const { commands, updateWorkspace } = makeCommands({ workspace: null });

    commands.handleAcceptDiagram('a');

    expect(updateWorkspace).not.toHaveBeenCalled();
  });

  it('delegates rejection to the remove handler', () => {
    const { commands, removeDiagram } = makeCommands();

    commands.handleRejectDiagram('a');

    expect(removeDiagram).toHaveBeenCalledWith('a');
  });
});
