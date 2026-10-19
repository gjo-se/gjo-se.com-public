/**
 * useKeyboardShortcuts – Central keyboard shortcut handler for the dedup board.
 *
 * Shortcut table:
 *   Escape → unpin + clear selection + reset similarity
 */

import { useEffect } from 'react';

import { useDedupStore } from '../store/dedupStore';

/**
 * Registers global keyboard shortcuts for the dedup board.
 *
 * Escape (unpin + deselect + similarity reset). Only active while the component
 * using this hook is mounted.
 */
export function useKeyboardShortcuts() {
  const unpinItem = useDedupStore((s) => s.unpinItem);
  const clearSelection = useDedupStore((s) => s.clearSelection);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput && e.key !== 'Escape') return;

      if (e.key === 'Escape') {
        // Inside an input: let the input clear its own search query
        // (type="search" native clearing + component-level Escape handling).
        if (isInput) return;
        e.preventDefault();
        unpinItem();
        clearSelection();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [unpinItem, clearSelection]);
}
