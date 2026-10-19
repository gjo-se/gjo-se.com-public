import { cva } from 'class-variance-authority';

import Button from '@src/components/primitives/Button/Button';
import Icon from '@src/components/primitives/Icon/Icon';
import Link from '@src/components/primitives/Link/Link';
import Text from '@src/components/primitives/Text/Text';

const counterVariants = cva('min-w-20 text-center');

export interface AdrNavigationProps {
  /** Current ADR ID string (e.g. "0001") */
  currentId: string;
  /** Total number of ADRs */
  total: number;
  /** Whether a previous ADR exists */
  hasPrev: boolean;
  /** Whether a next ADR exists */
  hasNext: boolean;
  /** Callback for previous ADR navigation */
  onPrev: () => void;
  /** Callback for next ADR navigation */
  onNext: () => void;
  /** Route path back to ADR list */
  backTo: string;
}

/**
 * AdrNavigation – pure presentational navigation bar for ADRs.
 *
 * Props-only component (golden G5). No store, context, or service access.
 * Displays a back-to-list link and prev/next buttons with current position.
 */
export default function AdrNavigation({
  currentId,
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  backTo,
}: AdrNavigationProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link to={backTo} variant="muted" size="sm">
        ← Zurück zur Liste
      </Link>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Vorherige ADR"
        >
          <Icon name="chevron-left" />
        </Button>
        <div className={counterVariants()}>
          <Text as="span" size="sm" color="muted" tabular>
            {currentId} / {String(total).padStart(4, '0')}
          </Text>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Nächste ADR"
        >
          <Icon name="chevron-right" />
        </Button>
      </div>
    </div>
  );
}
