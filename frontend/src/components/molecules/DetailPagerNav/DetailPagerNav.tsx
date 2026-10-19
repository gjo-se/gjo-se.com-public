import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';

import type { DetailPagerNavProps } from './DetailPagerNav.interface';

/**
 * DetailPagerNav – prev/next navigation for a detail view.
 *
 * Follows the current list order (filter + sort). Each arrow is disabled when
 * the corresponding neighbour is missing (boundary of the result set) or while
 * neighbours are loading. Navigation itself is delegated via callbacks (IoC).
 *
 * No className prop – styling exclusively via Props (closed API).
 */
export default function DetailPagerNav({
  prevId,
  nextId,
  onPrev,
  onNext,
  loading = false,
}: DetailPagerNavProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={loading || prevId === null}
        aria-label="Vorheriges Projekt"
      >
        <Icon name="chevron-left" />
        Zurück
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={loading || nextId === null}
        aria-label="Nächstes Projekt"
      >
        Weiter
        <Icon name="chevron-right" />
      </Button>
    </div>
  );
}

export type { DetailPagerNavProps } from './DetailPagerNav.interface';
