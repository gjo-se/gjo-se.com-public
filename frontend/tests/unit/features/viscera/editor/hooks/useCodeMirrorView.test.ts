/**
 * Tests: useCodeMirrorView
 *
 * Verifies the mount contract: exactly one EditorView is created into the
 * editor element with the built extensions, the view ref is populated, and
 * unmounting destroys the view and clears the ref.
 */

import { EditorView } from '@codemirror/view';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useCodeMirrorView } from '@src/features/viscera/editor/hooks/useCodeMirrorView';

import type { EditorView as EditorViewType } from '@codemirror/view';

let parent: HTMLDivElement | null = null;

function makeParent(): HTMLDivElement {
  parent = document.createElement('div');
  document.body.appendChild(parent);
  return parent;
}

afterEach(() => {
  parent?.remove();
  parent = null;
});

describe('useCodeMirrorView', () => {
  it('creates a view in the editor element and stores it in the ref', () => {
    const editorRef = { current: makeParent() };
    const viewRef: { current: EditorViewType | null } = { current: null };
    let built = 0;

    renderHook(() =>
      useCodeMirrorView(editorRef, viewRef, () => {
        built += 1;
        return [];
      }),
    );

    expect(built).toBe(1);
    expect(viewRef.current).toBeInstanceOf(EditorView);
    expect(editorRef.current?.contains(viewRef.current?.dom ?? null)).toBe(true);
  });

  it('destroys the view and clears the ref on unmount', () => {
    const editorRef = { current: makeParent() };
    const viewRef: { current: EditorViewType | null } = { current: null };

    const { unmount } = renderHook(() => useCodeMirrorView(editorRef, viewRef, () => []));
    const view = viewRef.current;
    unmount();

    expect(view).toBeInstanceOf(EditorView);
    expect(view?.dom.isConnected).toBe(false);
    expect(viewRef.current).toBeNull();
  });

  it('does not create a second view when re-rendered with a new builder', () => {
    const editorRef = { current: makeParent() };
    const viewRef: { current: EditorViewType | null } = { current: null };

    const { rerender } = renderHook(
      ({ version }: { version: number }) =>
        useCodeMirrorView(editorRef, viewRef, () => (version === 0 ? [] : [])),
      { initialProps: { version: 0 } },
    );
    const firstView = viewRef.current;

    rerender({ version: 1 });

    expect(viewRef.current).toBe(firstView);
  });
});
