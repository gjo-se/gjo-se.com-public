/**
 * Tests: ResetLayoutCommand
 *
 * Behaviour: executing clears every override in both maps, undo restores the
 * snapshot captured before the reset, and the input state stays untouched.
 */

import { describe, expect, it } from 'vitest';

import { ResetLayoutCommand } from '@src/features/viscera/services/resetLayoutCommand';

import type { OverridesState } from '@src/features/viscera/core/nodeOverrides';

function stateWithOverrides(): OverridesState {
  return {
    nodeOverrides: { 'view:api': { x: 10, y: 20 } },
    overrides: { 'view:api': { x: 10, y: 20 } },
  };
}

describe('ResetLayoutCommand', () => {
  it('clears both override maps on execute', () => {
    const command = new ResetLayoutCommand(stateWithOverrides().nodeOverrides);

    const next = command.execute(stateWithOverrides());

    expect(next.nodeOverrides).toEqual({});
    expect(next.overrides).toEqual({});
    expect(command.type).toBe('RESET_LAYOUT');
  });

  it('restores the captured overrides on undo', () => {
    const previous = stateWithOverrides().nodeOverrides;
    const command = new ResetLayoutCommand(previous);

    const restored = command.undo(command.execute(stateWithOverrides()));

    expect(restored.nodeOverrides).toEqual({ 'view:api': { x: 10, y: 20 } });
    expect(restored.overrides).toEqual({ 'view:api': { x: 10, y: 20 } });
  });

  it('does not mutate the input state', () => {
    const state = stateWithOverrides();

    new ResetLayoutCommand({ 'view:api': { x: 10, y: 20 } }).execute(state);

    expect(state.nodeOverrides).toEqual({ 'view:api': { x: 10, y: 20 } });
  });

  it('undo of a reset without previous overrides yields empty maps', () => {
    const command = new ResetLayoutCommand({});

    const restored = command.undo(command.execute(stateWithOverrides()));

    expect(restored.nodeOverrides).toEqual({});
    expect(restored.overrides).toEqual({});
  });
});
