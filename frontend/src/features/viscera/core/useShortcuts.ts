import { useEffect } from 'react';

export interface Shortcut {
  /** Key combination as string, e.g. '1', 'F', '+', 'Cmd+K' */
  key: string;
  handler: () => void;
  /** Human-readable description for ShortcutHints overlay */
  description: string;
  /** Grouping category for ShortcutHints overlay */
  group: 'navigation' | 'diagram' | 'tools';
  /** When false, the shortcut is ignored (default: true) */
  enabled?: boolean;
}

/**
 * Check whether a KeyboardEvent matches a shortcut key string.
 *
 * Supported formats:
 *   - Single key: 'F', '1', 'Escape'
 *   - Key with modifier: 'Cmd+K', 'Ctrl+K', 'Shift+?', 'Cmd+Shift+Z'
 *   - Special chars: '+', '-', '?', '0'
 */
function matchesShortcut(event: KeyboardEvent, shortcutKey: string): boolean {
  const parts = shortcutKey.split('+');
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  // Modifier checks
  const hasMeta = modifiers.includes('Cmd');
  const hasCtrl = modifiers.includes('Ctrl');
  const hasAlt = modifiers.includes('Alt');
  const hasShift = modifiers.includes('Shift');

  if (hasMeta !== event.metaKey) return false;
  if (hasCtrl !== event.ctrlKey) return false;
  if (hasAlt !== event.altKey) return false;
  if (hasShift !== event.shiftKey) return false;

  // Key matching
  switch (key) {
    case '+':
      // Match both '=' (unshifted) and '+' (shifted)
      return event.key === '+' || event.key === '=' || event.code === 'Equal';
    case '-':
      return event.key === '-' || event.code === 'Minus';
    case '?':
      return event.key === '?' || (event.shiftKey && event.key === '/');
    default:
      return event.key.toLowerCase() === key.toLowerCase();
  }
}

/**
 * Centralized keyboard shortcut registry.
 *
 * Registers a keydown listener on `window` and invokes handlers for matching shortcuts.
 * Shortcuts are ignored when focus is on `<input>`, `<textarea>`, or `[contenteditable]` elements.
 */
export function useShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const active = shortcuts.filter((s) => s.enabled !== false);

      const matched = active.find((s) => matchesShortcut(event, s.key));
      if (matched) {
        event.preventDefault();
        matched.handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
