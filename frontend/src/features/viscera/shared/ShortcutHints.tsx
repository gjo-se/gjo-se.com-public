import { cva } from 'class-variance-authority';
import { useEffect } from 'react';

import Text from '@src/components/primitives/Text/Text';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@src/components/vendor/shadcn/dialog';

import type { Shortcut } from '../core/useShortcuts';

// --- Props ---

export interface ShortcutHintsProps {
  /** Full list of registered shortcuts (enabled + disabled) */
  shortcuts: Shortcut[];
  /** Whether the overlay is currently visible */
  open: boolean;
  /** Called when the user wants to close the overlay (Esc, ✕ button, backdrop click) */
  onClose: () => void;
}

// --- Group display order ---

const GROUP_ORDER: Record<Shortcut['group'], { label: string; index: number }> = {
  navigation: { label: 'Navigation', index: 0 },
  diagram: { label: 'Diagramm', index: 1 },
  tools: { label: 'Werkzeuge', index: 2 },
};

const groupLabelVariants = cva('mb-2 tracking-wider');
const shortcutRowVariants = cva('flex items-center justify-between rounded px-2 py-1.5');

// --- Helpers ---

/** Format a shortcut key string for display, e.g. 'Cmd+K' → '⌘ K' */
function formatKey(key: string): string {
  return key
    .replace('Cmd', '⌘')
    .replace('Ctrl', '⌃')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥');
}

// --- Component ---

/**
 * Overlay displaying all available keyboard shortcuts, grouped by category.
 * Activated via the `?` key.
 */
export default function ShortcutHints({ shortcuts, open, onClose }: ShortcutHintsProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Group and sort shortcuts (only enabled ones are displayed)
  const enabledShortcuts = shortcuts.filter((s) => s.enabled !== false);

  const grouped = new Map<string, Shortcut[]>();
  enabledShortcuts.forEach((s) => {
    const group = s.group;
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(s);
  });

  // Sort groups by defined order
  const sortedGroups = Array.from(grouped.entries()).sort(
    (a, b) =>
      (GROUP_ORDER[a[0] as Shortcut['group']]?.index ?? 99)
      - (GROUP_ORDER[b[0] as Shortcut['group']]?.index ?? 99),
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Text size="md" weight="semibold">⌨ Tastaturkürzel</Text>
          </DialogTitle>
        </DialogHeader>

        {sortedGroups.map(([group, items]) => (
          <div key={group} className="mb-4 last:mb-0">
            <Text as="div">
              <div className={groupLabelVariants()}>
                <Text
                  size="xs"
                  color="muted"
                  as="div"
                  weight="semibold"
                  uppercase
                >
                  {GROUP_ORDER[group as Shortcut['group']]?.label ?? group}
                </Text>
              </div>
              {items.map((shortcut) => (
                <div
                  key={`${shortcut.key}-${shortcut.description}`}
                  className={shortcutRowVariants()}
                >
                  <kbd className="inline-flex min-w-kbd items-center justify-center rounded border border-gray-300 bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {formatKey(shortcut.key)}
                  </kbd>
                  <Text as="span" size="sm">
                    {shortcut.description}
                  </Text>
                </div>
              ))}
            </Text>
          </div>
        ))}

        {enabledShortcuts.length === 0 && (
          <div className="py-4">
            <Text size="sm" color="muted" align="center">
              Keine Tastaturkürzel verfügbar.
            </Text>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
