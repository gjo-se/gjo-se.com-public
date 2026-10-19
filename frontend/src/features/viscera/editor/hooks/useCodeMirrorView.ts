import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useEffect, useRef } from 'react';

import type { Extension } from '@codemirror/state';
import type { RefObject } from 'react';

/**
 * useCodeMirrorView – mounts a CodeMirror view once into *editorRef*.
 *
 * Builds the initial editor state from *buildExtensions* (invoked once on mount)
 * and tears the view down on unmount. The builder is read through a ref so the
 * mount effect needs no dependency on its identity. Shared by `YamlEditor` and
 * `AdrSplitEditor`.
 *
 * @param editorRef - Parent element the view is mounted into.
 * @param viewRef - Ref receiving the created `EditorView` (for later dispatch).
 * @param buildExtensions - Builds the initial extensions (called once on mount).
 */
export function useCodeMirrorView(
  editorRef: RefObject<HTMLDivElement | null>,
  viewRef: RefObject<EditorView | null>,
  buildExtensions: () => Extension[],
): void {
  const initializedRef = useRef(false);
  const buildRef = useRef(buildExtensions);

  useEffect(() => {
    buildRef.current = buildExtensions;
  });

  useEffect(() => {
    if (!editorRef.current || initializedRef.current) return;

    const view = new EditorView({
      state: EditorState.create({ doc: '', extensions: buildRef.current() }),
      parent: editorRef.current,
    });

    viewRef.current = view;
    initializedRef.current = true;

    return () => {
      view.destroy();
      viewRef.current = null;
      initializedRef.current = false;
    };
  }, [editorRef, viewRef]);
}
