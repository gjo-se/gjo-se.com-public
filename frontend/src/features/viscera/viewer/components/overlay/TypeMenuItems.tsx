import type { IconName } from '@src/components/primitives/Icon';
import Icon from '@src/components/primitives/Icon/Icon';
import type { ModelObjectType } from '@src/features/viscera/core/workspaceSchema';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { type: ModelObjectType; icon: IconName; label: string }[] = [
  { type: 'system', icon: 'server', label: 'Add System' },
  { type: 'container', icon: 'boxes', label: 'Add Container' },
  { type: 'component', icon: 'cpu', label: 'Add Component' },
  { type: 'store', icon: 'database', label: 'Add Store' },
  { type: 'person', icon: 'users', label: 'Add Person' },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TypeMenuItemsProps {
  onSelect: (type: ModelObjectType) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/** Shared type-selection menu — used by ＋ popover and context menu. */
export default function TypeMenuItems({ onSelect }: TypeMenuItemsProps) {
  return (
    <>
      {TYPE_OPTIONS.map(({ type, icon, label }) => (
        <div
          key={type}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(type)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(type); }}
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
          <Icon name={icon} size="sm" />
          {label}
        </div>
      ))}
    </>
  );
}
