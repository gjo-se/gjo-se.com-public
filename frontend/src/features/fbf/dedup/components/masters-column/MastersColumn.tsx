/**
 * MastersColumn – Center column (column 2) of the dedup board.
 *
 * Displays masters WITH slaves (canonical_id NULL, alias_count > 0) as
 * GitHub-Projects-style cards in a scrollable list; more cards are lazy-
 * loaded on demand (infinite scroll, no pagination). Cards select on click
 * (cmd/ctrl = toggle, shift = range); pinning a card shows the master's
 * slaves in column 3. Rows are drop targets for assigns.
 *
 * Similarity mode: while column-1 cards are selected, the same filtered base
 * set is shown re-sorted by vector similarity to the selection centroid
 * (similarity % chip per card, infinite scroll disabled – the ranked list is
 * complete). Toolbar search/status stay additive filters.
 */

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

import Text from '@src/components/primitives/Text';
import type { SimilarMasterItem } from '@src/features/fbf/dedup/services/dedup';
import { buildMastersDisplay, useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { columnShellVariants } from '../../utils/dedupBoardVariants';
import BoardCard from '../board-card/BoardCard';
import DedupColumnFooter from '../column/DedupColumnFooter';
import DedupColumnStatus from '../column/DedupColumnStatus';
import DndRow from '../dnd-row/DndRow';

/** Keeps the column scrollable while visually hiding the scrollbar. */
const HIDDEN_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** Center column – masters with slaves as lazy-loaded cards. */
export default function MastersColumn() {
  const masters = useDedupStore((s) => s.masters);
  const pinnedItem = useDedupStore((s) => s.pinnedItem);
  const filters = useDedupStore((s) => s.filters);
  const loading = useDedupStore((s) => s.loading);
  const error = useDedupStore((s) => s.error);
  const fetchMasters = useDedupStore((s) => s.fetchMasters);
  const loadMoreMasters = useDedupStore((s) => s.loadMoreMasters);
  const selectCard = useDedupStore((s) => s.selectCard);
  const sp2SelectedIds = useDedupStore((s) => s.sp2SelectedIds);
  const similarMasters = useDedupStore((s) => s.similarMasters);
  const similarLoading = useDedupStore((s) => s.similarLoading);
  const dragActive = useDedupStore((s) => s.dragActive);

  useEffect(() => {
    void fetchMasters();
  }, [filters.q, filters.status, filters.sort_by, filters.sort_order, fetchMasters]);

  const similarMode = similarMasters !== null;
  const doRenameSkill = useDedupStore((s) => s.doRenameSkill);
  const refreshSimilarMasters = useDedupStore((s) => s.refreshSimilarMasters);
  const sp2Anchor = useDedupStore((s) => s.sp2Anchor);
  const sp2SelectedItems = useDedupStore((s) => s.sp2SelectedItems);
  const pinItem = useDedupStore((s) => s.pinItem);

  // React to anchor changes: fetch SP2 ranking + pin (cmd-click preserves anchor → no re-sort).
  useEffect(() => {
    refreshSimilarMasters(false);
    if (sp2Anchor) {
      const item = masters?.items.find(i => i.id === sp2Anchor.id);
      if (item) pinItem(item);
    }
  }, [sp2Anchor, refreshSimilarMasters, pinItem, masters]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = !similarMode && masters !== null && masters.items.length < masters.total;
  useInfiniteScroll(sentinelRef, { rootRef: scrollerRef, hasMore, loading, onLoadMore: loadMoreMasters });

  const items = similarMode ? buildMastersDisplay(sp2SelectedItems, similarMasters) : (masters?.items ?? []);

  return (
    <div className={columnShellVariants()}>
      <div ref={scrollerRef} className={`flex-1 overflow-y-auto ${HIDDEN_SCROLLBAR}`}>
        {error && (
          <Text size="sm" color="error">{error}</Text>
        )}

        <DedupColumnStatus
          loading={loading}
          baseLoaded={masters !== null}
          similarMode={similarMode}
          similarLoading={similarLoading}
          hasItems={items.length > 0}
          emptyLabel="Keine Master mit Slaves gefunden."
        />

        <div className="flex flex-col gap-2 p-1">
          {items.map((item) => (
            <motion.div key={item.id} layout>
              <DndRow
                role="both"
                id={`drag-master-${item.id}`}
                data={{ slaveId: item.id, currentMasterId: null, name: item.name, aliasCount: item.alias_count }}
                dropId={`master-${item.id}`}
                dropData={{ masterId: item.id }}
              >
                {(isOver: boolean) => (
                  <BoardCard
                    item={item}
                    isPinned={pinnedItem?.id === item.id}
                    isSelected={sp2SelectedIds.has(item.id)}
                    onCardClick={(card, mods) => selectCard('masters', card, mods, items)}
                    onRename={(skillId, name) => { void doRenameSkill(skillId, name); }}
                    dimmed={dragActive && sp2SelectedIds.has(item.id)}
                    isDropHover={isOver}
                    similarity={
                    similarMode && !sp2SelectedIds.has(item.id)
                      ? (item as SimilarMasterItem).similarity
                      : undefined
                  }
                    bestMemberName={undefined}
                    bestMemberSimilarity={undefined}
                  />
              )}
              </DndRow>
            </motion.div>
          ))}
        </div>

        <DedupColumnFooter
          sentinelRef={sentinelRef}
          loading={loading}
          similarMode={similarMode}
          hasItems={items.length > 0}
        />
      </div>
    </div>
  );
}
