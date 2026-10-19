import { useState } from 'react';

import Text from '@src/components/primitives/Text';

import type { ReactNode } from 'react';

/** Context handed to the render-prop of {@link GhostRowShell}. */
export interface GhostRowContext {
  /** True once the user pressed Enter (used to surface required-field errors). */
  touched: boolean
  /** Enter handler that marks the row touched and submits (no-op while saving). */
  handleKeyDown: (e: React.KeyboardEvent) => void
}

export interface GhostRowShellProps {
  saving: boolean
  error: string | null
  /** Column count for the full-width error cell. */
  colSpan: number
  /** Optional row height in pixels. */
  rowHeight?: number
  onSubmit: () => void
  children: (ctx: GhostRowContext) => ReactNode
}

/**
 * GhostRowShell – shared inline-create row frame (Cmd/Ctrl-Enter to submit).
 *
 * Renders the `tr` with the error cell and wires the touched/Enter submit
 * behaviour, so the feature ghost rows only supply their column cells via the
 * render-prop. Replaces the copy-pasted frame in the Proof, SkillGroup and
 * Portfolio ghost rows.
 */
export function GhostRowShell({
  saving,
  error,
  colSpan,
  rowHeight,
  onSubmit,
  children,
}: GhostRowShellProps) {
  const [touched, setTouched] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saving) {
      e.preventDefault();
      setTouched(true);
      onSubmit();
    }
  };

  return (
    <tr
      className="bg-gray-50 dark:bg-gray-800/50"
      style={rowHeight != null ? { height: rowHeight } : undefined}
    >
      {error && (
        <td colSpan={colSpan} className="px-2 py-1">
          <Text size="xs" color="error">
            {error}
          </Text>
        </td>
      )}
      {!error && children({ touched, handleKeyDown })}
    </tr>
  );
}
