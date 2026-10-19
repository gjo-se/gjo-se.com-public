/**
 * PinnedInfoPanel – Right column (SP3) of the dedup board.
 *
 * SP3 has only two states:
 *   a) No SP2 master selected → empty placeholder
 *   b) SP2 master with slaves selected → scrollable list of slave BoardCards
 *
 * Each slave is draggable for reassignment or status changes.
 */

import { useEffect, useRef } from 'react';

import Card, { CardContent } from '@src/components/primitives/Card';
import Text from '@src/components/primitives/Text';
import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { columnSentinelVariants } from '../../utils/dedupBoardVariants';
import BoardCard from '../board-card/BoardCard';
import DndRow from '../dnd-row/DndRow';

/** Keeps the column scrollable while visually hiding the scrollbar. */
const HIDDEN_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** Right column – slaves of the pinned SP2 master as BoardCard list. */
export default function PinnedInfoPanel() {
  const pinnedItem = useDedupStore((s) => s.pinnedItem);
  const pinnedMasterSlaves = useDedupStore((s) => s.pinnedMasterSlaves);
  const loading = useDedupStore((s) => s.loading);
  const error = useDedupStore((s) => s.error);
  const doRenameSkill = useDedupStore((s) => s.doRenameSkill);
  const selectCard = useDedupStore((s) => s.selectCard);
  const sp3SelectedIds = useDedupStore((s) => s.sp3SelectedIds);
  const loadMorePinnedMasterSlaves = useDedupStore((s) => s.loadMorePinnedMasterSlaves);
  const dragActive = useDedupStore((s) => s.dragActive);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isMasterWithSlaves =
    pinnedItem !== null && pinnedItem.canonical_id === null && pinnedItem.alias_count > 0;

  // React to pin changes: fetch slaves when a master with slaves is pinned.
  const fetchPinnedMasterSlaves = useDedupStore((s) => s.fetchPinnedMasterSlaves);
  useEffect(() => {
    if (pinnedItem !== null && isMasterWithSlaves) {
      void fetchPinnedMasterSlaves();
    }
  }, [pinnedItem, isMasterWithSlaves, fetchPinnedMasterSlaves]);

  const hasMore = pinnedMasterSlaves !== null
    && pinnedMasterSlaves.items.length < pinnedMasterSlaves.total;
  useInfiniteScroll(sentinelRef, {
    rootRef: scrollerRef,
    hasMore,
    loading,
    onLoadMore: loadMorePinnedMasterSlaves,
  });

  // ── Not a master with slaves → empty placeholder ────────────────────────
  if (!isMasterWithSlaves) {
    return (
      <Card>
        <CardContent>
          <Text variant="body" color="muted">Kein Skill ausgewählt.</Text>
        </CardContent>
      </Card>
    );
  }

  // ── Master with slaves → show BoardCards for each slave ─────────────────
  const items = pinnedMasterSlaves?.items ?? [];

  return (
    <DndRow role="target" id={`pinned-master-${pinnedItem.id}`} data={{ masterId: pinnedItem.id }}>
      <Card>
        <CardContent>
          <div
            ref={scrollerRef}
            className={`h-full overflow-y-auto ${HIDDEN_SCROLLBAR}`}
          >
            {error && (
              <Text size="sm" color="error">{error}</Text>
            )}

            {loading && !pinnedMasterSlaves && (
              <Text size="sm" color="muted">Lädt…</Text>
            )}

            {!loading && items.length === 0 && (
              <Text size="sm" color="muted">Keine Slaves gefunden.</Text>
            )}

            <div className="flex flex-col gap-2 p-1">
              {items.map((item) => (
                <DndRow
                  key={item.id}
                  role="source"
                  id={`alias-${item.id}`}
                  data={{ slaveId: item.id, currentMasterId: item.canonical_id, name: item.name }}
                >
                  <BoardCard
                    item={item}
                    isPinned={false}
                    isSelected={sp3SelectedIds.has(item.id)}
                    onCardClick={(card, mods) => selectCard('pinned', card, mods, items)}
                    onRename={(skillId, name) => { void doRenameSkill(skillId, name); }}
                    dimmed={dragActive && sp3SelectedIds.has(item.id)}
                  />
                </DndRow>
              ))}
            </div>
            {/* Sentinel – triggers lazy loading of the next card batch */}
            <div ref={sentinelRef} className={columnSentinelVariants()} />
          </div>
        </CardContent>
      </Card>
    </DndRow>
  );
}
