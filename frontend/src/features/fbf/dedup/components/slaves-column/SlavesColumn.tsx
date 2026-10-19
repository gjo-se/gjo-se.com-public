/**
 * SlavesColumn – Left column (column 1) of the dedup board.
 *
 * Displays masters WITHOUT slaves (canonical_id NULL, alias_count 0) as
 * GitHub-Projects-style cards in a scrollable list; more cards are lazy-
 * loaded on demand (infinite scroll, no pagination). Cards select on click
 * (cmd/ctrl = toggle, shift = range over the visible order, double click =
 * take leadership) and are draggable: drop on a column-2 card to assign,
 * or on a status drop zone.
 *
 * Similarity mode (active while this column leads the selection): the
 * selected cards stay on top, the solo neighbors follow below sorted by
 * centroid similarity (% chip). The neighbor ORDER freezes on the first
 * click – further selection clicks never re-sort the list under the
 * cursor; infinite scroll is disabled. Search and status stay additive
 * filters (SlavesToolbar, slaveQ / slaveStatus) and re-anchor the order.
 */

import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';


import Text from '@src/components/primitives/Text';
import type { SimilarMasterItem } from '@src/features/fbf/dedup/services/dedup';
import { buildSlavesDisplay, useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { columnShellVariants, dissolveOverlayVariants } from '../../utils/dedupBoardVariants';
import BoardCard from '../board-card/BoardCard';
import DedupColumnFooter from '../column/DedupColumnFooter';
import DedupColumnStatus from '../column/DedupColumnStatus';
import DndRow from '../dnd-row/DndRow';

import type { DroppableData } from '../../utils/dndTypes';


/** Keeps the column scrollable while visually hiding the scrollbar. */
const HIDDEN_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** Left column – masters without slaves as lazy-loaded cards. */
export default function SlavesColumn() {
  const slaves = useDedupStore((s) => s.slaves);
  const pinnedItem = useDedupStore((s) => s.pinnedItem);
  const loading = useDedupStore((s) => s.loading);
  const error = useDedupStore((s) => s.error);
  const fetchSlaves = useDedupStore((s) => s.fetchSlaves);
  const loadMoreSlaves = useDedupStore((s) => s.loadMoreSlaves);
  const slaveQ = useDedupStore((s) => s.slaveQ);
  const selectCard = useDedupStore((s) => s.selectCard);
  const sp1SelectedIds = useDedupStore((s) => s.sp1SelectedIds);
  const sp1SelectedItems = useDedupStore((s) => s.sp1SelectedItems);
  const similarSlaves = useDedupStore((s) => s.similarSlaves);
  const similarLoading = useDedupStore((s) => s.similarLoading);
  const dragActive = useDedupStore((s) => s.dragActive);

  useEffect(() => {
    void fetchSlaves();
  }, [slaveQ, fetchSlaves]);

  const similarMode = similarSlaves !== null;
  const doRenameSkill = useDedupStore((s) => s.doRenameSkill);
  const refreshSimilarMasters = useDedupStore((s) => s.refreshSimilarMasters);
  const sp1Anchor = useDedupStore((s) => s.sp1Anchor);

  // React to anchor changes: fetch SP1 neighbors (cmd-click preserves anchor → no re-sort).
  useEffect(() => {
    refreshSimilarMasters(true);
  }, [sp1Anchor, refreshSimilarMasters]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = !similarMode && slaves !== null && slaves.items.length < slaves.total;
  useInfiniteScroll(sentinelRef, { rootRef: scrollerRef, hasMore, loading, onLoadMore: loadMoreSlaves });

  const { setNodeRef: setColumnDropRef, isOver: isColumnOver } = useDroppable({
    id: 'slaves-column-drop',
    data: { zone: 'dissolve-group' } satisfies DroppableData,
  });

  const items = similarMode
    ? buildSlavesDisplay(sp1SelectedItems, similarSlaves)
    : (slaves?.items ?? []);

  return (
    <div className={columnShellVariants()}>
      <div
        ref={(node) => {
          setColumnDropRef(node);
          (scrollerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={`relative flex-1 overflow-y-auto transition-colors duration-200 ${HIDDEN_SCROLLBAR} ${
          isColumnOver ? 'bg-blue-100' : ''
        }`}
      >
        {isColumnOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className={dissolveOverlayVariants()}>
              <Text size="sm" weight="semibold" color="inherit">
                Gruppe auflösen
              </Text>
            </div>
          </div>
        )}
        {error && (
          <Text size="sm" color="error">{error}</Text>
        )}

        <DedupColumnStatus
          loading={loading}
          baseLoaded={slaves !== null}
          similarMode={similarMode}
          similarLoading={similarLoading}
          hasItems={items.length > 0}
          emptyLabel="Keine Master ohne Slaves gefunden."
        />

        <div className="flex flex-col gap-2 p-1">
          {items.map((item) => (
            <motion.div key={item.id} layout>
              <DndRow
                role="source"
                id={`slave-${item.id}`}
                data={{ slaveId: item.id, currentMasterId: item.canonical_id, name: item.name }}
              >
                <BoardCard
                  item={item}
                  isPinned={pinnedItem?.id === item.id}
                  isSelected={sp1SelectedIds.has(item.id)}
                  onCardClick={(card, mods) => selectCard('slaves', card, mods, items)}
                  onRename={(skillId, name) => { void doRenameSkill(skillId, name); }}
                  dimmed={dragActive && sp1SelectedIds.has(item.id)}
                  similarity={
                  similarMode && !sp1SelectedIds.has(item.id)
                    ? (item as SimilarMasterItem).similarity
                    : undefined
                }
                />
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
