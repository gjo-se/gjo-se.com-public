/**
 * DedupDndContext – DndContext wrapper for the dedup board.
 *
 * Provides drag-and-drop between:
 *   - SlavesColumn / PinnedInfoPanel (draggable) → MastersColumn (droppable)
 *   - Any draggable → DropZoneBar (deprecated / pending / active / rejected)
 *
 * handleDragEnd delegates to DnDCommand objects (command pattern).
 * Each command has a canExecute guard and an async execute function.
 * Self-drop (slave on own master) is a no-op.
 */

import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';

import Chip from '@src/components/primitives/Chip';

import { activateAsMaster } from '../../services/activateAsMaster';
import { assignToMaster } from '../../services/assignToMaster';
import { assignToSuggestion } from '../../services/assignToSuggestion';
import { changeStatus } from '../../services/changeStatus';
import { dissolveGroup } from '../../services/dissolveGroup';
import { unassignSkills } from '../../services/unassignSkills';
import { unassignToSP1 } from '../../services/unassignToSP1';
import { useDedupStore } from '../../store/dedupStore';
import BoardCard from '../board-card/BoardCard';


import type { BoardItem, SimilarMasterItem } from '../../services/dedup';
import type { DraggableData, DroppableData, DnDCommandContext } from '../../utils/dndTypes';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

export type { DraggableData, DroppableData } from '../../utils/dndTypes';

/** Commands evaluated in priority order — first match wins. */
const COMMANDS = [
  changeStatus,
  unassignToSP1,
  dissolveGroup,
  unassignSkills,
  assignToSuggestion,
  activateAsMaster,
  assignToMaster,
];

/** Context provider that enables DnD across the dedup board columns. */
export default function DedupDndContext({ children }: { children: React.ReactNode }) {
  const store = useDedupStore((s) => s);
  const sp1SelectedIds = useDedupStore((s) => s.sp1SelectedIds);
  const sp2SelectedIds = useDedupStore((s) => s.sp2SelectedIds);
  const sp3SelectedIds = useDedupStore((s) => s.sp3SelectedIds);
  const pinnedItem = useDedupStore((s) => s.pinnedItem);

  const isSelectedInAnyBoard = (id: number) =>
    sp1SelectedIds.has(id) || sp2SelectedIds.has(id) || sp3SelectedIds.has(id);

  const [activeItem, setActiveItem] = useState<DraggableData | null>(null);
  const [activeBoardItem, setActiveBoardItem] = useState<BoardItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DraggableData | undefined;
    if (data) {
      setActiveItem(data);
      setActiveBoardItem(findBoardItem(data.slaveId));
      useDedupStore.setState({ dragActive: true });
    }
  };

  const handleDragCancel = () => {
    setActiveItem(null);
    setActiveBoardItem(null);
    useDedupStore.setState({ dragActive: false });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    setActiveBoardItem(null);
    useDedupStore.setState({ dragActive: false });

    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as DraggableData | undefined;
    const overData = over.data.current as DroppableData | undefined;
    if (!activeData || !overData) return;

    // Per-column selection: SP1 → sp1, SP2 → sp2, SP3 → sp3.
    const storeState = useDedupStore.getState();
    const isSp2Source = activeData.aliasCount !== undefined && activeData.aliasCount > 0;
    const isSp3Source = activeData.currentMasterId != null;
    const isBulk = isSp2Source
      ? storeState.sp2SelectedIds.has(activeData.slaveId)
      : isSp3Source
        ? storeState.sp3SelectedIds.has(activeData.slaveId)
        : storeState.sp1SelectedIds.has(activeData.slaveId);
    const ids = isBulk
      ? Array.from(isSp2Source
        ? storeState.sp2SelectedIds
        : isSp3Source
          ? storeState.sp3SelectedIds
          : storeState.sp1SelectedIds)
      : [activeData.slaveId];

    const ctx: DnDCommandContext = {
      active: activeData, over: overData, isBulk, ids, store,
      setAutoAdvance: () => { useDedupStore.setState({ autoAdvance: true }); },
    };

    const cmd = COMMANDS.find(c => c.canExecute(ctx));
    if (cmd) {
      void cmd.execute(ctx).then(() => {
        void store.fetchPinnedMasterSlaves();
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay>
        {activeItem && (() => {
          const totalSelected = sp1SelectedIds.size + sp2SelectedIds.size + sp3SelectedIds.size;
          const isBulkDrag = isSelectedInAnyBoard(activeItem.slaveId) && totalSelected > 1;
          return (
            <div className="relative">
              {activeBoardItem && (
                <BoardCard
                  item={activeBoardItem}
                  isPinned={pinnedItem?.id === activeBoardItem.id}
                  isSelected={isSelectedInAnyBoard(activeBoardItem.id)}
                  onCardClick={() => undefined}
                  similarity={(activeBoardItem as Partial<SimilarMasterItem>).similarity}
                />
              )}
              {isBulkDrag && (
                <div className={BULK_BADGE_POSITION}>
                  <Chip variant="info" size="sm">+{sp1SelectedIds.size + sp2SelectedIds.size + sp3SelectedIds.size - 1}</Chip>
                </div>
              )}
            </div>
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
}

/** Badge offset for the bulk counter on the drag ghost (top-right corner). */
const BULK_BADGE_POSITION = 'absolute -top-2 -right-2';

/** Finds the full board item for a dragged id across all store pools. */
function findBoardItem(id: number): BoardItem | null {
  const s = useDedupStore.getState();
  const pools: (BoardItem[] | undefined)[] = [
    s.sp1SelectedItems,
    s.sp2SelectedItems,
    s.sp3SelectedItems,
    s.similarSlaves ?? undefined,
    s.similarMasters ?? undefined,
    s.slaves?.items,
    s.masters?.items,
    s.pinnedMasterSlaves?.items,
  ];
  return pools.reduce<BoardItem | null>(
    (found, pool) => found ?? pool?.find((i) => i.id === id) ?? null,
    null,
  );
}
