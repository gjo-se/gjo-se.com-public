import { useCallback, useEffect, useRef } from 'react';

import { useEditorSplit } from './useEditorSplit';

import type { RefObject } from 'react';


/**
 * useSplitResize – drag-resize logic for the viscera split panes.
 *
 * Bundles the container ref, drag state and window mousemove/mouseup handling
 * used by `AdrSplitEditor` and `VisceraEditorPage`, and returns the pane widths
 * derived from the persisted split ratio.
 *
 * @param scope - Which split editor to manage (`'adr'` or `'yaml'`).
 * @returns Container ref, resize-start handler and the two pane widths.
 */
export function useSplitResize(scope: 'adr' | 'yaml'): {
  containerRef: RefObject<HTMLDivElement | null>
  handleResizeStart: () => void
  editorWidth: string
  previewWidth: string
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const { ratio: splitRatio, setRatio } = useEditorSplit(scope);
  const splitRatioRef = useRef(splitRatio);

  // Keep ref in sync for the mouseup handler (outside React's render cycle)
  useEffect(() => {
    splitRatioRef.current = splitRatio;
  }, [splitRatio]);

  const handleResizeStart = useCallback(() => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      setRatio(ratio);
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setRatio(splitRatioRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setRatio]);

  return {
    containerRef,
    handleResizeStart,
    editorWidth: `${splitRatio}%`,
    previewWidth: `${100 - splitRatio}%`,
  };
}
