/**
 * Tests: groupCommands
 *
 * Behaviour: group creation (validation, id generation incl. collision
 * suffixes, optimistic canvas/workspace update, rollback on sync failure),
 * renaming and deletion with their queued sync mutations.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGroupCommands } from '@src/features/viscera/viewer/services/groupCommands';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeObject, makeWorkspace, resetVisceraStore } from '../../helpers';

const store = () => useVisceraStore.getState();

function makeCommands(workspace = makeWorkspace()) {
  const updateWorkspace = vi.fn();
  const commands = createGroupCommands({ workspace, updateWorkspace });
  return { commands, updateWorkspace };
}

function lastMutationId(): string {
  const queue = store().syncQueue;
  return queue[queue.length - 1]!.mutationId;
}

beforeEach(() => {
  resetVisceraStore();
});

describe('createGroupCommands – create validation', () => {
  it('rejects an empty or whitespace-only name', async () => {
    const { commands, updateWorkspace } = makeCommands();

    await expect(commands.handleCreateGroup('   ', { x: 0, y: 0 })).resolves.toEqual({
      ok: false,
      error: 'Bitte einen Namen eingeben',
    });
    expect(updateWorkspace).not.toHaveBeenCalled();
  });

  it('rejects creation without a workspace', async () => {
    const { commands } = makeCommands(null as never);

    await expect(commands.handleCreateGroup('Group', { x: 0, y: 0 })).resolves.toEqual({
      ok: false,
      error: 'Workspace nicht geladen',
    });
  });
});

describe('createGroupCommands – creation', () => {
  it('creates the group optimistically and resolves after sync confirmation', async () => {
    const { commands, updateWorkspace } = makeCommands();

    const promise = commands.handleCreateGroup('My Group', { x: 10, y: 20 });

    expect(store().nodes[0]).toMatchObject({ id: 'my-group', type: 'group', isTransient: true });
    expect(updateWorkspace.mock.calls[0]?.[0].groups).toEqual([
      { id: 'my-group', name: 'My Group', description: '', members: [] },
    ]);
    expect(store().syncQueue[0]).toMatchObject({
      action: 'create_group',
      payload: { id: 'my-group', name: 'My Group' },
    });

    store().removeFromQueue(lastMutationId());

    await expect(promise).resolves.toEqual({ ok: true, id: 'my-group', name: 'My Group' });
  });

  it('trims the name before generating the id', async () => {
    const { commands } = makeCommands();

    const promise = commands.handleCreateGroup('  My Group  ', { x: 0, y: 0 });
    store().removeFromQueue(lastMutationId());
    const outcome = await promise;

    expect(outcome).toEqual({ ok: true, id: 'my-group', name: 'My Group' });
  });

  it('rolls back node, workspace entry and reports the sync error on failure', async () => {
    const { commands, updateWorkspace } = makeCommands();

    const promise = commands.handleCreateGroup('My Group', { x: 0, y: 0 });
    store().updateSyncEntry(lastMutationId(), { status: 'failed', error: '409 conflict' });

    await expect(promise).resolves.toEqual({ ok: false, error: '409 conflict' });
    expect(store().nodes).toEqual([]);
    expect(updateWorkspace.mock.calls[1]?.[0].groups).toEqual([]);
  });

  it('uses a fallback error message when the sync failure carries no error', async () => {
    const { commands } = makeCommands();

    const promise = commands.handleCreateGroup('My Group', { x: 0, y: 0 });
    store().updateSyncEntry(lastMutationId(), { status: 'failed' });

    await expect(promise).resolves.toEqual({
      ok: false,
      error: 'Group konnte nicht erstellt werden',
    });
  });

  it('suffixes an id that is already taken by a group', async () => {
    const { commands } = makeCommands(
      makeWorkspace({
        groups: [{ id: 'my-group', name: 'Existing', description: '', members: [] }],
      }),
    );

    const promise = commands.handleCreateGroup('My Group', { x: 0, y: 0 });
    store().removeFromQueue(lastMutationId());
    const outcome = await promise;

    expect(outcome).toMatchObject({ ok: true, id: 'my-group-2' });
  });

  it('increments the suffix until it is free', async () => {
    const { commands } = makeCommands(
      makeWorkspace({
        groups: [
          { id: 'my-group', name: 'A', description: '', members: [] },
          { id: 'my-group-2', name: 'B', description: '', members: [] },
        ],
        objects: [makeObject({ id: 'my-group-3' })],
      }),
    );

    const promise = commands.handleCreateGroup('My Group', { x: 0, y: 0 });
    store().removeFromQueue(lastMutationId());
    const outcome = await promise;

    expect(outcome).toMatchObject({ ok: true, id: 'my-group-4' });
  });
});

describe('createGroupCommands – rename', () => {
  it('updates the node label and workspace group and queues update_group', () => {
    store().addNode({
      id: 'my-group',
      type: 'group',
      data: { name: 'Old' },
      position: { x: 0, y: 0 },
      isTransient: false,
    });
    const { commands, updateWorkspace } = makeCommands(
      makeWorkspace({ groups: [{ id: 'my-group', name: 'Old', description: '', members: [] }] }),
    );

    commands.handleRenameGroup('my-group', '  New  ');

    expect(store().nodes[0]?.data.name).toBe('New');
    expect(updateWorkspace.mock.calls[0]?.[0].groups[0].name).toBe('New');
    expect(store().syncQueue[0]).toMatchObject({
      action: 'update_group',
      payload: { name: 'New' },
    });
  });

  it('ignores an empty name', () => {
    const { commands, updateWorkspace } = makeCommands();

    commands.handleRenameGroup('my-group', '   ');

    expect(updateWorkspace).not.toHaveBeenCalled();
    expect(store().syncQueue).toEqual([]);
  });

  it('still updates the workspace when the group node is not on the canvas', () => {
    const { commands, updateWorkspace } = makeCommands(
      makeWorkspace({ groups: [{ id: 'my-group', name: 'Old', description: '', members: [] }] }),
    );

    commands.handleRenameGroup('my-group', 'New');

    expect(updateWorkspace.mock.calls[0]?.[0].groups[0].name).toBe('New');
  });
});

describe('createGroupCommands – delete', () => {
  it('removes the group from workspace and canvas and queues delete_group', () => {
    store().addNode({
      id: 'my-group',
      type: 'group',
      data: {},
      position: { x: 0, y: 0 },
      isTransient: false,
    });
    const { commands, updateWorkspace } = makeCommands(
      makeWorkspace({ groups: [{ id: 'my-group', name: 'G', description: '', members: [] }] }),
    );

    commands.handleDeleteGroup('my-group');

    expect(updateWorkspace.mock.calls[0]?.[0].groups).toEqual([]);
    expect(store().nodes).toEqual([]);
    expect(store().syncQueue[0]).toMatchObject({
      action: 'delete_group',
      nodeId: 'my-group',
      payload: {},
    });
  });

  it('leaves member nodes untouched', () => {
    store().addNode({
      id: 'member',
      type: 'containerCard',
      data: {},
      position: { x: 0, y: 0 },
      isTransient: false,
    });
    const { commands } = makeCommands(
      makeWorkspace({
        groups: [{ id: 'my-group', name: 'G', description: '', members: ['member'] }],
      }),
    );

    commands.handleDeleteGroup('my-group');

    expect(store().nodes.map((n) => n.id)).toEqual(['member']);
  });

  it('does nothing without a workspace', () => {
    const { commands, updateWorkspace } = makeCommands(null as never);

    commands.handleDeleteGroup('my-group');

    expect(updateWorkspace).not.toHaveBeenCalled();
  });
});
