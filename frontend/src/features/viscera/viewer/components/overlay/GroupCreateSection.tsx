import { useReactFlow } from '@xyflow/react';
import { useCallback, useState } from 'react';

import Icon from '@src/components/primitives/Icon/Icon';
import Input from '@src/components/primitives/Input/Input';
import Text from '@src/components/primitives/Text/Text';

import type { GroupCreateOutcome } from '../../hooks/useViewerActions';
import type { XYPosition } from '@xyflow/react';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GroupCreateSectionProps {
  onCreateGroup: (name: string, position: XYPosition) => Promise<GroupCreateOutcome>;
  /** Called after the group was created successfully (closes the popover). */
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * "Neue Group" section of the ＋-Popover (#2276): a menu row that expands into
 * an inline name input. Enter confirms (API call), Escape returns to the menu
 * without any API call. Errors (e.g. 409 ID collision) show inline.
 */
export default function GroupCreateSection({ onCreateGroup, onSuccess }: GroupCreateSectionProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [mode, setMode] = useState<'menu' | 'input'>('menu');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startInput = useCallback(() => {
    setMode('input');
    setName('');
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    setMode('menu');
    setName('');
    setError(null);
  }, []);

  const confirm = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);

    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const result = await onCreateGroup(trimmed, position);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setMode('menu');
    setName('');
    setSubmitting(false);
    onSuccess();
  }, [name, submitting, screenToFlowPosition, onCreateGroup, onSuccess]);

  if (mode === 'menu') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={startInput}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') startInput(); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.75rem',
          fontSize: '0.875rem',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
      >
        <Icon name="folder-kanban" size="sm" />
        Neue Group
      </div>
    );
  }

  return (
    <div className="px-3 pb-2 pt-1">
      <Input
        autoFocus
        type="text"
        value={name}
        disabled={submitting}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void confirm();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cancel();
          }
        }}
        placeholder="Group-Name…"
        aria-label="Group-Name"
      />
      {error && (
        <div className="mt-1">
          <Text color="error" size="xs">
            {error}
          </Text>
        </div>
      )}
    </div>
  );
}
