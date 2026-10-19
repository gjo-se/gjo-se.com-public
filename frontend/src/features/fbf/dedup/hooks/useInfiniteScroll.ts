/**
 * useInfiniteScroll – IntersectionObserver-based lazy loading for board columns.
 *
 * Observes a sentinel element at the end of a scrollable list and calls
 * onLoadMore when it becomes visible (GitHub-board-style card loading).
 * Pass the scroll container as rootRef so intersection is measured against
 * the column scroller instead of the viewport (nested-overflow safe).
 */

import { useEffect, type RefObject } from 'react';

interface UseInfiniteScrollOptions {
  rootRef?: RefObject<HTMLElement | null>
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
}

/** Calls onLoadMore whenever the sentinel scrolls into view (200px margin). */
export function useInfiniteScroll(
  sentinelRef: RefObject<HTMLElement | null>,
  { rootRef, hasMore, loading, onLoadMore }: UseInfiniteScrollOptions,
): void {
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { root: rootRef?.current ?? null, rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinelRef, rootRef, hasMore, loading, onLoadMore]);
}
