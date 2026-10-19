/**
 * Tests: canvasCommands
 *
 * Behaviour: canvas add requests are queued at the given position, a missing
 * position is a no-op, and the context-menu action transfers the stored
 * position into a pending add while closing the menu.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { createCanvasCommands } from '@src/features/viscera/viewer/services/canvasCommands';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

const store = () => useVisceraStore.getState();

beforeEach(() => {
  resetVisceraStore();
});

describe('createCanvasCommands – handleCanvasAdd', () => {
  it('queues a pending add with the given type and position', () => {
    const commands = createCanvasCommands();

    commands.handleCanvasAdd('component', { x: 10, y: 20 });

    expect(store().pendingCanvasAdd).toEqual({
      type: 'component',
      position: { x: 10, y: 20 },
    });
  });

  it('does nothing without a position', () => {
    const commands = createCanvasCommands();

    commands.handleCanvasAdd('system');

    expect(store().pendingCanvasAdd).toBeNull();
  });
});

describe('createCanvasCommands – context menu', () => {
  it('stores the position for the canvas context menu', () => {
    const commands = createCanvasCommands();

    commands.handleCanvasContextMenu({ x: 5, y: 6 });

    expect(store().contextMenuPosition).toEqual({ x: 5, y: 6 });
  });

  it('turns a menu action into a pending add at the stored position', () => {
    const commands = createCanvasCommands();
    commands.handleCanvasContextMenu({ x: 5, y: 6 });

    commands.handleCanvasContextMenuAction('container');

    expect(store().contextMenuPosition).toBeNull();
    expect(store().pendingCanvasAdd).toEqual({
      type: 'container',
      position: { x: 5, y: 6 },
    });
  });

  it('does nothing when the menu has no stored position', () => {
    const commands = createCanvasCommands();

    commands.handleCanvasContextMenuAction('container');

    expect(store().pendingCanvasAdd).toBeNull();
  });
});
