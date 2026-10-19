import type { ReactNode } from 'react';

export interface InlineEditDisplayProps {
  /** Current raw value, used as the hover title and by the caller's preview. */
  value: string
  /** Enters edit mode (click / Enter / Space). */
  onStart: () => void
  /** Preview content (already rendered by the caller). */
  children: ReactNode
}

/**
 * InlineEditDisplay – the click-to-edit preview box used by inline cells.
 *
 * Renders the frameless, hover-highlighted read-only box that opens the editor
 * on click / Enter / Space. Shared by the statement, label and question cells.
 */
export default function InlineEditDisplay({ value, onStart, children }: InlineEditDisplayProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onStart}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStart(); }
      }}
      className="w-full cursor-pointer rounded px-1 -mx-1 py-0.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 min-h-7"
      title={value || undefined}
    >
      {children}
    </div>
  );
}
