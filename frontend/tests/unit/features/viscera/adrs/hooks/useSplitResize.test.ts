/**
 * Tests: useSplitResize
 *
 * Verifies the drag lifecycle at the public interface: starting a drag sets the
 * resize cursor, mouse movement derives the split from the container bounds,
 * mouse-up restores the cursor and stops further updates, and unmounting
 * detaches the window listeners.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSplitResize } from '@src/features/viscera/adrs/hooks/useSplitResize';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

const CONTAINER_WIDTH = 1000;

function attachContainer(
  ref: { current: HTMLDivElement | null },
): void {
  ref.current = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: CONTAINER_WIDTH, height: 400 }),
  } as unknown as HTMLDivElement;
}

beforeEach(() => {
  resetVisceraStore();
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

describe('useSplitResize', () => {
  it('derives both pane widths from the stored ratio', () => {
    const { result } = renderHook(() => useSplitResize('adr'));

    expect(result.current.editorWidth).toBe('50%');
    expect(result.current.previewWidth).toBe('50%');
  });

  it('sets the resize cursor when a drag starts', () => {
    const { result } = renderHook(() => useSplitResize('adr'));

    act(() => result.current.handleResizeStart());

    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');
  });

  it('updates the split while dragging over the container', () => {
    const { result } = renderHook(() => useSplitResize('adr'));
    attachContainer(result.current.containerRef);

    act(() => result.current.handleResizeStart());
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 250 }));
    });

    expect(result.current.editorWidth).toBe('25%');
    expect(useVisceraStore.getState().splitRatioAdr).toBeCloseTo(0.25);
  });

  it('restores the cursor and ignores movement after mouse up', () => {
    const { result } = renderHook(() => useSplitResize('adr'));
    attachContainer(result.current.containerRef);

    act(() => result.current.handleResizeStart());
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 300 }));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900 }));
    });

    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
    expect(result.current.editorWidth).toBe('30%');
  });

  it('detaches the window listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useSplitResize('adr'));
    attachContainer(result.current.containerRef);

    act(() => result.current.handleResizeStart());
    unmount();
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 700 }));
    });

    expect(useVisceraStore.getState().splitRatioAdr).toBe(0.5);
  });
});
