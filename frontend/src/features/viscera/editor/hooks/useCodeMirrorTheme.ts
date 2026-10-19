import { Compartment } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { useEffect, useMemo } from 'react';

import type { EditorView } from '@codemirror/view';

/**
 * Central hook for CodeMirror dark/light theme switching via MutationObserver.
 *
 * Creates and manages a Compartment for the theme extension.
 * Returns the Compartment instance so the calling component can use `.of()`
 * during CodeMirror initialization.
 *
 * @param viewRef - React RefObject to the CodeMirror EditorView instance.
 */
export function useCodeMirrorTheme(
  viewRef: React.RefObject<EditorView | null>,
): Compartment {
  const compartment = useMemo(() => new Compartment(), []);

  useEffect(() => {
    const reconfigure = () => {
      const isDark = document.documentElement.classList.contains('dark');
      viewRef.current?.dispatch({
        effects: compartment.reconfigure(isDark ? oneDark : []),
      });
    };

    const observer = new MutationObserver(() => {
      reconfigure();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [viewRef, compartment]);

  return compartment;
}
