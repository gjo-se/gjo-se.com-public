/**
 * Tests: useKeyboardShortcuts
 *
 * Verifies Escape unpins the current master and clears the selection through
 * the public store actions, that text inputs keep their own Escape handling,
 * and that the listener is removed on unmount.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useKeyboardShortcuts } from '@src/features/fbf/dedup/hooks/useKeyboardShortcuts';
import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { boardItem, resetDedupStore } from '../../helpers/dedupStore';

const store = () => useDedupStore.getState();

/**
 * Dispatches a keydown event at the document level.
 *
 * @param key Pressed key.
 * @param target Element that receives the event.
 */
function press(key: string, target: HTMLElement = document.body): void {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

beforeEach(() => {
  resetDedupStore();
});

describe('useKeyboardShortcuts', () => {
  it('unpins the master and clears the selection on Escape', () => {
    const item = boardItem({ id: 7, name: 'React' });
    act(() => {
      store().pinItem(item);
      store().selectCard('slaves', item, { meta: false, shift: false });
    });
    renderHook(() => useKeyboardShortcuts());

    press('Escape');

    expect(store().pinnedItem).toBeNull();
    expect(store().sp1SelectedIds.size).toBe(0);
    expect(store().sp1Anchor).toBeNull();
  });

  it('ignores Escape inside a text input so the input can clear itself', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => store().pinItem(boardItem({ id: 3 })));
    renderHook(() => useKeyboardShortcuts());

    press('Escape', input);

    expect(store().pinnedItem?.id).toBe(3);
    input.remove();
  });

  it('ignores unrelated keys', () => {
    act(() => store().pinItem(boardItem({ id: 4 })));
    renderHook(() => useKeyboardShortcuts());

    press('x');

    expect(store().pinnedItem?.id).toBe(4);
  });

  it('ignores unrelated keys inside a text input', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    act(() => store().pinItem(boardItem({ id: 5 })));
    renderHook(() => useKeyboardShortcuts());

    press('Enter', textarea);

    expect(store().pinnedItem?.id).toBe(5);
    textarea.remove();
  });

  it('detaches the listener on unmount', () => {
    act(() => store().pinItem(boardItem({ id: 6 })));
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    unmount();
    press('Escape');

    expect(store().pinnedItem?.id).toBe(6);
  });
});
