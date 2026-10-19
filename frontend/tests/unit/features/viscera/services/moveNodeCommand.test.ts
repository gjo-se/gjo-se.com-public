/**
 * Tests: MoveNodeCommand
 *
 * Behaviour: apply/undo a node move within the narrow overrides state, using
 * the composite `${diagramKey}:${nodeId}` key, restoring the previous position
 * or removing the override entirely, without mutating the input state.
 */

import { describe, expect, it } from 'vitest';

import { MoveNodeCommand } from '@src/features/viscera/services/moveNodeCommand';

import type { OverridesState } from '@src/features/viscera/core/nodeOverrides';

function emptyState(): OverridesState {
  return { nodeOverrides: {}, overrides: {} };
}

describe('MoveNodeCommand', () => {
  it('stores the new position under the per-diagram key in both maps', () => {
    const command = new MoveNodeCommand('api', { x: 40, y: 60 }, 'container-app');

    const next = command.execute(emptyState());

    expect(next.nodeOverrides).toEqual({ 'container-app:api': { x: 40, y: 60 } });
    expect(next.overrides).toEqual({ 'container-app:api': { x: 40, y: 60 } });
    expect(command.type).toBe('MOVE_NODE');
  });

  it('does not mutate the input state', () => {
    const state = emptyState();

    new MoveNodeCommand('api', { x: 40, y: 60 }, 'view').execute(state);

    expect(state.nodeOverrides).toEqual({});
    expect(state.overrides).toEqual({});
  });

  it('restores the previous position on undo when one existed', () => {
    const command = new MoveNodeCommand(
      'api',
      { x: 40, y: 60 },
      'view',
      { x: 10, y: 20 },
    );

    const moved = command.execute(emptyState());

    const reverted = command.undo(moved);

    expect(reverted.nodeOverrides['view:api']).toEqual({ x: 10, y: 20 });
    expect(reverted.overrides['view:api']).toEqual({ x: 10, y: 20 });
  });

  it('removes the override on undo when there was no previous position', () => {
    const command = new MoveNodeCommand('api', { x: 40, y: 60 }, 'view');

    const reverted = command.undo(command.execute(emptyState()));

    expect(reverted.nodeOverrides).toEqual({});
    expect(reverted.overrides).toEqual({});
  });

  it('keeps overrides of other diagrams and nodes untouched on undo', () => {
    const command = new MoveNodeCommand('api', { x: 40, y: 60 }, 'view');
    const state: OverridesState = {
      nodeOverrides: { 'other:api': { x: 1, y: 2 }, 'view:db': { x: 3, y: 4 } },
      overrides: { 'other:api': { x: 1, y: 2 }, 'view:db': { x: 3, y: 4 } },
    };

    const reverted = command.undo(command.execute(state));

    expect(reverted.nodeOverrides).toEqual({
      'other:api': { x: 1, y: 2 },
      'view:db': { x: 3, y: 4 },
    });
  });

  it('supports position 0/0 as a real previous position', () => {
    const command = new MoveNodeCommand('api', { x: 40, y: 60 }, 'view', { x: 0, y: 0 });

    const reverted = command.undo(command.execute(emptyState()));

    expect(reverted.nodeOverrides['view:api']).toEqual({ x: 0, y: 0 });
  });
});
