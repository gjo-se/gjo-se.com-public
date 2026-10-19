/**
 * Tests: useKeyboardShortcuts
 *
 * Verifies key dispatch to store actions and injected callbacks, the text-input
 * guard, and that unmounting detaches the listener.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { useKeyboardShortcuts } from '@src/features/viscera/viewer/hooks/useKeyboardShortcuts';

import { resetVisceraStore } from '../../helpers';

function press(key: string, init: KeyboardEventInit = {}): void {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));
  });
}

beforeEach(() => {
  resetVisceraStore();
});

describe('useKeyboardShortcuts', () => {
  it('requests fit view on the 1 and 0 keys', () => {
    renderHook(() => useKeyboardShortcuts(() => undefined, () => undefined));

    press('1');
    expect(useVisceraStore.getState().fitViewRequested).toBe(true);

    act(() => useVisceraStore.getState().resetFitViewRequested());
    press('0');
    expect(useVisceraStore.getState().fitViewRequested).toBe(true);
  });

  it('zooms in on the 2 key and resets on the 3 key', () => {
    renderHook(() => useKeyboardShortcuts(() => undefined, () => undefined));

    press('2');
    expect(useVisceraStore.getState().viewport.zoom).toBe(1.5);

    press('3');
    expect(useVisceraStore.getState().viewport.zoom).toBe(1);
  });

  it('resets the viewport on the 3 key', () => {
    useVisceraStore.setState({ viewport: { x: 100, y: 200, zoom: 2 } });
    renderHook(() => useKeyboardShortcuts(() => undefined, () => undefined));

    press('3');

    expect(useVisceraStore.getState().viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('toggles the shortcut overlay on the question mark key', () => {
    renderHook(() => useKeyboardShortcuts(() => undefined, () => undefined));

    press('?');

    expect(useVisceraStore.getState().shortcutsOpen).toBe(true);
  });

  it('delegates fullscreen and delete to the injected callbacks', () => {
    let fullscreen = 0;
    let deleted = 0;
    renderHook(() => useKeyboardShortcuts(() => { fullscreen += 1; }, () => { deleted += 1; }));

    press('F');
    press('Delete');
    press('Backspace');

    expect(fullscreen).toBe(1);
    expect(deleted).toBe(2);
  });

  it('ignores shortcuts while a text input is focused', () => {
    renderHook(() => useKeyboardShortcuts(() => undefined, () => undefined));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    });

    expect(useVisceraStore.getState().fitViewRequested).toBe(false);
    input.remove();
  });

  it('detaches the listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts(() => undefined, () => undefined),
    );

    unmount();
    press('1');

    expect(useVisceraStore.getState().fitViewRequested).toBe(false);
  });
});
