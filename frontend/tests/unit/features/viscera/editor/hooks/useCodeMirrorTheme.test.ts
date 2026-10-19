/**
 * Tests: useCodeMirrorTheme
 *
 * Verifies the compartment handle is stable across renders and that a
 * dark/light class change on <html> reconfigures the CodeMirror view, while an
 * unmounted hook no longer reacts to class changes.
 */

import { Compartment } from '@codemirror/state';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useCodeMirrorTheme } from '@src/features/viscera/editor/hooks/useCodeMirrorTheme';

import type { EditorView } from '@codemirror/view';
import type { RefObject } from 'react';
import type { Transaction } from '@codemirror/state';

function makeViewRef(): { ref: RefObject<EditorView | null>; transactions: Transaction[] } {
  const transactions: Transaction[] = [];
  const view = {
    dispatch: (transaction: Transaction) => {
      transactions.push(transaction);
    },
  } as unknown as EditorView;
  return { ref: { current: view }, transactions };
}

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

describe('useCodeMirrorTheme', () => {
  it('returns the same compartment instance across renders', () => {
    const { result, rerender } = renderHook(() => useCodeMirrorTheme({ current: null }));

    const first = result.current;
    rerender();

    expect(first).toBeInstanceOf(Compartment);
    expect(result.current).toBe(first);
  });

  it('reconfigures the view when the document theme class changes', async () => {
    const { ref, transactions } = makeViewRef();
    renderHook(() => useCodeMirrorTheme(ref));

    document.documentElement.classList.add('dark');

    await waitFor(() => expect(transactions.length).toBe(1));
    expect(transactions[0]?.effects).toBeDefined();
  });

  it('stops observing the theme after unmount', async () => {
    const { ref, transactions } = makeViewRef();
    const { unmount } = renderHook(() => useCodeMirrorTheme(ref));

    unmount();
    document.documentElement.classList.add('dark');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(transactions).toEqual([]);
  });
});
