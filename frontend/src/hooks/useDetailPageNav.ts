/**
 * useDetailPageNav – shared prev/next navigation state for admin detail pages.
 *
 * Reads `allIds` and `from` from `location.state` (set by the list page when
 * navigating into a detail view), derives the neighbour ids and returns a
 * `goToNeighbour` callback that preserves the list context. Replaces the
 * copy-pasted `allIds`/`backTo`/`prevId`/`nextId`/`goToNeighbour` block in the
 * CRM, application and portfolio detail pages.
 */
import { useLocation, useNavigate } from 'react-router';

export interface DetailPageNav<TId extends string | number> {
  backTo: string;
  allIds: TId[] | null;
  prevId: TId | null;
  nextId: TId | null;
  goToNeighbour: (neighbourId: TId) => void;
}

export interface UseDetailPageNavOptions<TId extends string | number> {
  /** Current entity id (numeric id or slug). */
  currentId: TId;
  /** Detail route template containing the placeholder, e.g. `/admin/x/:id`. */
  detailPath: string;
  /** Fallback list route when `location.state.from` is absent. */
  defaultBackTo: string;
  /** Placeholder token inside `detailPath`, defaults to `:id`. */
  paramName?: string;
}

/**
 *
 */
export function useDetailPageNav<TId extends string | number>({
  currentId,
  detailPath,
  defaultBackTo,
  paramName = ':id',
}: UseDetailPageNavOptions<TId>): DetailPageNav<TId> {
  const location = useLocation();
  const navigate = useNavigate();

  const allIds: TId[] | null =
    (location.state as { allIds?: TId[] } | null)?.allIds ?? null;
  const backTo =
    (location.state as { from?: string } | null)?.from ?? defaultBackTo;

  const idx = allIds ? allIds.indexOf(currentId) : -1;
  const prevId = idx > 0 ? allIds![idx - 1] : null;
  const nextId = idx < (allIds?.length ?? 0) - 1 ? allIds![idx + 1] : null;

  const goToNeighbour = (neighbourId: TId) => {
    navigate(detailPath.replace(paramName, String(neighbourId)), {
      state: { from: backTo, allIds },
    });
  };

  return { backTo, allIds, prevId, nextId, goToNeighbour };
}
