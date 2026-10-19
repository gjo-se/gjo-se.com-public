/**
 * Tests: useCanvasContextMenu
 *
 * Verifies the pane context menu (position, outside-click/Escape close), the
 * placeholder creation action, and the pending canvas-add watcher.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { useCanvasContextMenu } from '@src/features/viscera/viewer/hooks/useCanvasContextMenu';

import { resetVisceraStore } from '../../helpers';

import type { Node } from '@xyflow/react';

const flowMock = vi.hoisted(() => ({
  addedNodes: [] as Node[],
  setNodes: (updater: (nodes: Node[]) => Node[]) => updater([]),
}));

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    screenToFlowPosition: (position: { x: number; y: number }) => position,
    addNodes: (nodes: Node[]) => {
      flowMock.addedNodes.push(...nodes);
    },
    setNodes: flowMock.setNodes,
  }),
}));

beforeEach(() => {
  resetVisceraStore();
  flowMock.addedNodes = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCanvasContextMenu', () => {
  it('opens the menu at the pointer position and suppresses the native menu', () => {
    const { result } = renderHook(() => useCanvasContextMenu({}));
    const event = new MouseEvent('contextmenu', { clientX: 42, clientY: 24, cancelable: true });

    act(() => result.current.onPaneContextMenu(event));

    expect(event.defaultPrevented).toBe(true);
    expect(result.current.contextMenuPosition).toEqual({ x: 42, y: 24 });
  });

  it('does nothing when the action fires without an open menu', () => {
    const { result } = renderHook(() => useCanvasContextMenu({}));

    act(() => result.current.handleContextMenuAction('container'));

    expect(flowMock.addedNodes).toEqual([]);
  });

  it('creates an editing placeholder and tracks it as optimistic', () => {
    const { result } = renderHook(() => useCanvasContextMenu({}));
    act(() => result.current.onPaneContextMenu(new MouseEvent('contextmenu', { clientX: 10, clientY: 20 })));

    act(() => result.current.handleContextMenuAction('container'));

    expect(result.current.contextMenuPosition).toBeNull();
    expect(flowMock.addedNodes).toHaveLength(1);
    const placeholder = flowMock.addedNodes[0];
    expect(placeholder?.type).toBe('containerCard');
    expect(placeholder?.data).toMatchObject({
      isEditing: true,
      editingLabel: 'New Container',
      name: '',
    });
    expect(Object.keys(useVisceraStore.getState().pendingOptimisticNodes)).toHaveLength(1);
  });

  it('closes the menu on an outside click after the guard delay', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCanvasContextMenu({}));
    act(() => result.current.onPaneContextMenu(new MouseEvent('contextmenu', { clientX: 10, clientY: 20 })));
    result.current.contextMenuRef.current = document.createElement('div');

    act(() => vi.advanceTimersByTime(100));
    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(result.current.contextMenuPosition).toBeNull();
  });

  it('closes the menu on escape', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCanvasContextMenu({}));
    act(() => result.current.onPaneContextMenu(new MouseEvent('contextmenu', { clientX: 10, clientY: 20 })));
    act(() => vi.advanceTimersByTime(100));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.contextMenuPosition).toBeNull();
  });

  it('consumes a pending canvas add request from the store', () => {
    renderHook(() => useCanvasContextMenu({}));

    act(() => {
      useVisceraStore.getState().setPendingCanvasAdd({ type: 'component', position: { x: 5, y: 6 } });
    });

    expect(useVisceraStore.getState().pendingCanvasAdd).toBeNull();
    expect(flowMock.addedNodes).toHaveLength(1);
    expect(flowMock.addedNodes[0]?.type).toBe('containerCard');
    expect(Object.keys(useVisceraStore.getState().pendingOptimisticNodes)).toHaveLength(1);
  });
});
