import { useEffect } from 'react';

/**
 * Fires `onCancel` when the user presses Escape.
 * Used by credential forms to close on Escape.
 */
export function useEscapeToCancel(onCancel: () => void): void {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);
}
