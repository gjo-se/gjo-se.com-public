/**
 * Tests: assignToMaster command
 *
 * Guard (master id present, no single self-drop) and the assign effect.
 * The reassign path is behavioural: after assigning from a pinned master the
 * previously pinned item must remain pinned so further slaves can be moved.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { assignToMaster } from '@src/features/fbf/dedup/services/assignToMaster';

import type { BoardItem } from '@src/features/fbf/dedup/services/dedup';

import { makeCommandFixture } from '../support/commandContext';

function makeBoardItem(id: number): BoardItem {
  return {
    id,
    name: `Skill ${id}`,
    description: null,
    status: 'pending',
    canonical_id: null,
    master_name: null,
    alias_count: 0,
    importance: null,
    level: null,
    level_public: null,
  };
}

beforeEach(() => {
  useDedupStore.setState({ pinnedItem: null });
});

describe('assignToMaster.canExecute', () => {
  it('erlaubt Drops nur mit definierter masterId', () => {
    const valid = makeCommandFixture({ masterId: 3 });
    const missingMaster = makeCommandFixture({});

    expect(assignToMaster.canExecute(valid.ctx)).toBe(true);
    expect(assignToMaster.canExecute(missingMaster.ctx)).toBe(false);
  });

  it('verhindert den Einzel-Drop auf den eigenen Master', () => {
    const selfDrop = makeCommandFixture({ masterId: 3 }, { currentMasterId: 3 });

    expect(assignToMaster.canExecute(selfDrop.ctx)).toBe(false);
  });

  it('erlaubt den Selbst-Drop im Bulk-Modus', () => {
    const bulkSelfDrop = makeCommandFixture({ masterId: 3 }, { currentMasterId: 3 }, true);

    expect(assignToMaster.canExecute(bulkSelfDrop.ctx)).toBe(true);
  });
});

describe('assignToMaster.execute', () => {
  it('weist die ausgewählten IDs dem Ziel-Master zu', async () => {
    const { ctx, calls } = makeCommandFixture({ masterId: 3 }, { currentMasterId: null }, true);

    await assignToMaster.execute(ctx);

    expect(calls).toEqual([{ name: 'doBulkAction', args: ['assign', [7, 8], 3] }]);
  });

  it('stellt beim Re-Assign den zuvor gepinnten Master wieder her', async () => {
    const previousPin = makeBoardItem(1);
    useDedupStore.setState({ pinnedItem: previousPin });
    const { ctx, store } = makeCommandFixture({ masterId: 3 }, { currentMasterId: 9 }, true);
    store.doBulkAction = async () => {
      useDedupStore.setState({ pinnedItem: makeBoardItem(2) });
    };

    await assignToMaster.execute(ctx);

    expect(useDedupStore.getState().pinnedItem).toBe(previousPin);
  });

  it('lässt die neue Pinnung bei der Erstzuordnung bestehen', async () => {
    const newPin = makeBoardItem(2);
    const { ctx, store } = makeCommandFixture({ masterId: 3 }, { currentMasterId: null }, true);
    store.doBulkAction = async () => {
      useDedupStore.setState({ pinnedItem: newPin });
    };

    await assignToMaster.execute(ctx);

    expect(useDedupStore.getState().pinnedItem).toBe(newPin);
  });
});
