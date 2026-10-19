/**
 * Tests: diagramCommands
 *
 * Behaviour: diagram dialog lifecycle, optimistic create/edit/delete plus the
 * queued sync mutations, derived-state computation (unassigned count),
 * derived-diagram materialization (idempotent), node extension and the
 * sync-outcome promise contract.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDiagramCommands,
  createDiagramDerivedState,
  createMaterializeDerivedDiagramCommand,
  extendAndPersistDiagramNodes,
  waitForSyncOutcome,
} from '@src/features/viscera/viewer/services/diagramCommands';
import { buildSyncEntry } from '@src/features/viscera/store/diagramSync';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeDiagram, makeObject, makeWorkspace, resetVisceraStore } from '../../helpers';

import type {
  DiagramDialogState,
  DiagramFormData,
} from '@src/features/viscera/viewer/services/diagramCommands';
import type { Workspace } from '@src/features/viscera/core/workspaceSchema';
import type { Dispatch, SetStateAction } from 'react';
import type { Mock } from 'vitest';

const store = () => useVisceraStore.getState();

const EMPTY_DIALOG: DiagramDialogState = { open: false, isSubmitting: false, error: null };

function makeSetter<T>(initial: T) {
  let current = initial;
  const setter: Dispatch<SetStateAction<T>> = (next) => {
    current = typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
  };
  return { get: () => current, set: setter };
}

function formData(patch: Partial<DiagramFormData> = {}): DiagramFormData {
  return {
    key: 'container-app',
    name: 'App',
    type: 'container',
    description: null,
    parent: 'sys',
    layout: null,
    ...patch,
  };
}

function makeCommands(patch: {
  workspace?: ReturnType<typeof makeWorkspace> | null;
  currentViewKey?: string;
  updateWorkspace?: Mock<(workspace: Workspace) => void>;
  setViewKey?: Mock<(key: string) => void>;
  dialog?: ReturnType<typeof makeSetter<DiagramDialogState>>;
} = {}) {
  const dialog = patch.dialog ?? makeSetter(EMPTY_DIALOG);
  const updateWorkspace =
    patch.updateWorkspace ?? vi.fn<(workspace: Workspace) => void>();
  const setViewKey = patch.setViewKey ?? vi.fn<(key: string) => void>();
  const commands = createDiagramCommands({
    workspace: patch.workspace === undefined ? makeWorkspace() : patch.workspace,
    updateWorkspace,
    currentViewKey: patch.currentViewKey ?? 'SystemContext',
    setViewKey,
    setCreateDiagramDialog: dialog.set,
  });
  return { commands, dialog, updateWorkspace, setViewKey };
}

beforeEach(() => {
  resetVisceraStore();
});

describe('createDiagramCommands – dialog lifecycle', () => {
  it('opens the create dialog empty', () => {
    const { commands, dialog } = makeCommands();

    commands.handleCreateDiagram();

    expect(dialog.get()).toEqual({ open: true, isSubmitting: false, error: null });
  });

  it('closes the dialog and clears the error and edit target', () => {
    const { commands, dialog } = makeCommands();
    dialog.set({ open: true, isSubmitting: false, error: 'x', editDiagram: makeDiagram() });

    commands.handleCreateDiagramClose(false);

    expect(dialog.get()).toEqual({
      open: false,
      isSubmitting: false,
      error: null,
      editDiagram: undefined,
    });
  });

  it('ignores a close(true) request', () => {
    const { commands, dialog } = makeCommands();

    commands.handleCreateDiagramClose(true);

    expect(dialog.get().open).toBe(false);
  });

  it('opens the dialog prefilled for an existing diagram', () => {
    const diagram = makeDiagram({ key: 'container-app' });
    const { commands, dialog } = makeCommands({
      workspace: makeWorkspace({ diagrams: [diagram] }),
    });

    commands.handleEditDiagram('container-app');

    expect(dialog.get()).toMatchObject({ open: true, editDiagram: diagram });
  });

  it('does nothing when editing an unknown diagram', () => {
    const { commands, dialog } = makeCommands();

    commands.handleEditDiagram('missing');

    expect(dialog.get().open).toBe(false);
  });
});

describe('createDiagramCommands – create submit', () => {
  it('appends the diagram optimistically and queues create_diagram', () => {
    const { commands, updateWorkspace } = makeCommands({
      workspace: makeWorkspace({ diagrams: [] }),
    });

    commands.handleCreateDiagramSubmit(formData());

    const workspace = updateWorkspace.mock.calls[0]?.[0];
    expect(workspace.diagrams).toHaveLength(1);
    expect(workspace.diagrams[0]).toMatchObject({
      key: 'container-app',
      name: 'App',
      type: 'container',
      parent: 'sys',
      source: 'code',
      layout: 'lr',
      nodes: {},
      status: 'pending',
    });

    expect(store().syncQueue[0]).toMatchObject({
      nodeId: 'container-app',
      action: 'create_diagram',
      payload: {
        key: 'container-app',
        name: 'App',
        type: 'container',
        description: null,
        parent: 'sys',
        layout: null,
      },
    });
  });

  it('reports an error when the workspace is not loaded', () => {
    const { commands, dialog, updateWorkspace } = makeCommands({ workspace: null });
    dialog.set({ open: true, isSubmitting: false, error: null });

    commands.handleCreateDiagramSubmit(formData());

    expect(updateWorkspace).not.toHaveBeenCalled();
    expect(dialog.get()).toEqual({
      open: true,
      isSubmitting: false,
      error: 'Workspace not loaded',
    });
    expect(store().syncQueue).toEqual([]);
  });
});

describe('createDiagramCommands – edit submit', () => {
  it('queues an update_diagram mutation and closes the dialog', () => {
    const { commands, dialog } = makeCommands();

    commands.handleEditDiagramSubmit(formData({ name: 'Renamed' }));

    expect(store().syncQueue[0]).toMatchObject({
      nodeId: 'container-app',
      action: 'update_diagram',
      payload: { name: 'Renamed', type: 'container', description: null, layout: null },
    });
    expect(dialog.get()).toEqual(EMPTY_DIALOG);
  });
});

describe('createDiagramCommands – delete', () => {
  it('removes the diagram from the workspace and queues its deletion', () => {
    const { commands, updateWorkspace } = makeCommands({
      workspace: makeWorkspace({ diagrams: [makeDiagram({ key: 'container-app' })] }),
    });

    commands.handleDeleteDiagram('container-app');

    expect(updateWorkspace.mock.calls[0]?.[0].diagrams).toEqual([]);
    expect(store().syncQueue[0]).toMatchObject({
      action: 'delete_diagram',
      nodeId: 'container-app',
    });
  });

  it('returns to the default view when the active diagram is deleted', () => {
    const { commands, setViewKey } = makeCommands({
      workspace: makeWorkspace({ diagrams: [makeDiagram({ key: 'container-app' })] }),
      currentViewKey: 'container-app',
    });

    commands.handleDeleteDiagram('container-app');

    expect(setViewKey).toHaveBeenCalledWith('SystemContext');
  });

  it('keeps the current view when another diagram is deleted', () => {
    const { commands, setViewKey } = makeCommands({
      workspace: makeWorkspace({
        diagrams: [makeDiagram({ key: 'container-app' }), makeDiagram({ key: 'container-b' })],
      }),
      currentViewKey: 'container-b',
    });

    commands.handleDeleteDiagram('container-app');

    expect(setViewKey).not.toHaveBeenCalled();
  });

  it('does nothing without a workspace', () => {
    const { commands, updateWorkspace } = makeCommands({ workspace: null });

    commands.handleDeleteDiagram('container-app');

    expect(updateWorkspace).not.toHaveBeenCalled();
    expect(store().syncQueue).toEqual([]);
  });
});

describe('createDiagramDerivedState', () => {
  it('returns no diagrams and zero unassigned objects for an empty workspace', () => {
    expect(createDiagramDerivedState(makeWorkspace(), 'SystemContext', [])).toEqual({
      diagrams: [],
      activeDiagram: null,
      unassignedCount: 0,
    });
  });

  it('finds the active diagram by key', () => {
    const workspace = makeWorkspace({
      diagrams: [makeDiagram({ key: 'a' }), makeDiagram({ key: 'b' })],
    });

    expect(createDiagramDerivedState(workspace, 'b', []).activeDiagram).toMatchObject({
      key: 'b',
    });
  });

  it('counts objects that are neither assigned nor persons', () => {
    const workspace = makeWorkspace({
      diagrams: [makeDiagram({ key: 'a', nodes: { assigned: { x: 0, y: 0 } } })],
    });
    const objects = [
      makeObject({ id: 'assigned' }),
      makeObject({ id: 'free' }),
      makeObject({ id: 'person', type: 'person' }),
    ];

    expect(createDiagramDerivedState(workspace, 'a', objects).unassignedCount).toBe(1);
  });
});

describe('createMaterializeDerivedDiagramCommand', () => {
  it('appends the derived diagram and queues create_diagram', () => {
    const updateWorkspace = vi.fn();
    const derived = makeDiagram({ key: 'sys-components', parent: 'sys', type: 'component' });

    createMaterializeDerivedDiagramCommand({
      workspace: makeWorkspace({ diagrams: [] }),
      updateWorkspace,
      derivedDiagram: derived,
    });

    expect(updateWorkspace.mock.calls[0]?.[0].diagrams).toEqual([derived]);
    expect(store().syncQueue[0]).toMatchObject({
      nodeId: 'sys-components',
      action: 'create_diagram',
      payload: { key: 'sys-components', parent: 'sys', type: 'component' },
    });
  });

  it('is idempotent when the diagram is already persisted', () => {
    const updateWorkspace = vi.fn();
    const derived = makeDiagram({ key: 'sys-components' });

    createMaterializeDerivedDiagramCommand({
      workspace: makeWorkspace({ diagrams: [derived] }),
      updateWorkspace,
      derivedDiagram: derived,
    });

    expect(updateWorkspace).not.toHaveBeenCalled();
    expect(store().syncQueue).toEqual([]);
  });
});

describe('extendAndPersistDiagramNodes', () => {
  it('adds missing object ids at 0/0 and persists the merged node map', () => {
    const updateWorkspace = vi.fn();
    const workspace = makeWorkspace({
      diagrams: [makeDiagram({ key: 'a', nodes: { existing: { x: 10, y: 20 } } })],
    });

    const result = extendAndPersistDiagramNodes(workspace, updateWorkspace, 'a', [
      'existing',
      'new',
    ]);

    expect(result?.key).toBe('a');
    expect(updateWorkspace.mock.calls[0]?.[0].diagrams[0].nodes).toEqual({
      existing: { x: 10, y: 20 },
      new: { x: 0, y: 0 },
    });
    expect(store().syncQueue[0]).toMatchObject({
      nodeId: 'a',
      action: 'persist_layout',
      payload: { nodes: { existing: { x: 10, y: 20 }, new: { x: 0, y: 0 } } },
    });
  });

  it('returns null for an unknown diagram and changes nothing', () => {
    const updateWorkspace = vi.fn();

    const result = extendAndPersistDiagramNodes(makeWorkspace(), updateWorkspace, 'missing', ['a']);

    expect(result).toBeNull();
    expect(updateWorkspace).not.toHaveBeenCalled();
    expect(store().syncQueue).toEqual([]);
  });
});

describe('waitForSyncOutcome', () => {
  it('resolves successfully when the mutation leaves the queue', async () => {
    const entry = buildSyncEntry('a', 'create_diagram', {});
    store().queueSync(entry);

    const outcome = waitForSyncOutcome(entry.mutationId);
    store().removeFromQueue(entry.mutationId);

    await expect(outcome).resolves.toEqual({ success: true });
  });

  it('resolves with the error when the mutation fails', async () => {
    const entry = buildSyncEntry('a', 'create_diagram', {});
    store().queueSync(entry);

    const outcome = waitForSyncOutcome(entry.mutationId);
    store().updateSyncEntry(entry.mutationId, { status: 'failed', error: '409 conflict' });

    await expect(outcome).resolves.toEqual({ success: false, error: '409 conflict' });
  });

});
