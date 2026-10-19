import { cva } from 'class-variance-authority';

import Text from '@src/components/primitives/Text/Text';

import type { ExistingNodeCandidate } from '../../hooks/useExistingNodeCandidates';

const listScrollVariants = cva('max-h-64 overflow-y-auto');
const truncateVariants = cva('truncate');

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CandidateNodeListProps {
  /** Existing nodes that fit the active diagram (already excluding assigned ones). */
  candidates: ExistingNodeCandidate[];
  /** Called with the node ID when the user selects a candidate. */
  onSelect: (id: string) => void;
  disabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Molecule: renders the candidate list for the „Vorhandenen Node hinzufügen"
 * section of the AddNodeOverlay. Pure props/callbacks — no store access.
 */
export default function CandidateNodeList(
  { candidates, onSelect, disabled = false }: CandidateNodeListProps,
) {
  if (candidates.length === 0) {
    return (
      <div className="px-3 py-4">
        <Text size="sm" color="muted" align="center">
          Keine passenden Nodes verfügbar
        </Text>
      </div>
    );
  }

  return (
    <div className={listScrollVariants()}>
      {candidates.map(({ id, name }) => (
        <div
          key={id}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={() => {
            if (!disabled) onSelect(id);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') onSelect(id);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            padding: '0.375rem 0.75rem',
            fontSize: '0.875rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!disabled) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
          }}
        >
          <div className={truncateVariants()}>
            <Text as="span" size="sm" weight="medium">
              {name}
            </Text>
          </div>
          <Text as="span" size="xs" color="muted">
            {id}
          </Text>
        </div>
      ))}
    </div>
  );
}
