import DetailPagerNav from '@src/components/molecules/DetailPagerNav/DetailPagerNav';
import Link from '@src/components/primitives/Link';

import type { DetailPageShellProps } from './DetailPageShell.interface';

/**
 * DetailPageShell – shared frame for admin detail pages.
 *
 * Renders the centered page wrapper plus the header row (back-link + pager),
 * so CRM, application and portfolio detail pages share one identical header
 * instead of copy-pasting it. The body is passed as children.
 */
export default function DetailPageShell({
  backTo,
  prevId,
  nextId,
  onPrev,
  onNext,
  children,
}: DetailPageShellProps) {
  return (
    <div className="mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link to={backTo} variant="muted" size="sm">
          ← Zurück zur Liste
        </Link>
        <DetailPagerNav
          prevId={prevId}
          nextId={nextId}
          loading={false}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      {children}
    </div>
  );
}

export type { DetailPageShellProps } from './DetailPageShell.interface';
