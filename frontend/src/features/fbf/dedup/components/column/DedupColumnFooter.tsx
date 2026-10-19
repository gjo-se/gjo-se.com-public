import Text from '@src/components/primitives/Text';

import { columnSentinelVariants } from '../../utils/dedupBoardVariants';

import type { RefObject } from 'react';

interface DedupColumnFooterProps {
  /** Sentinel element that triggers lazy loading of the next batch. */
  sentinelRef: RefObject<HTMLDivElement | null>
  /** Loading state of the base list. */
  loading: boolean
  /** Whether a similarity ranking currently drives the column. */
  similarMode: boolean
  /** Whether the rendered list has any items. */
  hasItems: boolean
}

/** Lazy-load sentinel + trailing loader shared by the dedup columns. */
export default function DedupColumnFooter({
  sentinelRef,
  loading,
  similarMode,
  hasItems,
}: DedupColumnFooterProps) {
  return (
    <>
      {/* Sentinel – triggers lazy loading of the next card batch */}
      <div ref={sentinelRef} className={columnSentinelVariants()} />

      {loading && !similarMode && hasItems && (
        <Text size="sm" color="muted" align="center">Lädt weitere…</Text>
      )}
    </>
  );
}
