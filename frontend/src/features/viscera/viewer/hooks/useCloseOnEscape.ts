import { useEffect } from 'react';

/**
 * Closes an overlay when Escape is pressed while it is open.
 *
 * Shared by the viscera node context menus (card, file, group): closes on
 * Escape while open and detaches the listener on close/unmount.
 */
export function useCloseOnEscape(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
}
