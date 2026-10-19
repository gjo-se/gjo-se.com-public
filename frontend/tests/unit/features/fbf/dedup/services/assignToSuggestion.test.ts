/**
 * Tests: assignToSuggestion command
 *
 * Verifies the guard (suggestion zone + master id + no single self-assign)
 * and the assign effect on the store for bulk and single drops.
 */
import { describe, expect, it } from 'vitest';

import { assignToSuggestion } from '@src/features/fbf/dedup/services/assignToSuggestion';

import { makeCommandFixture } from '../support/commandContext';

describe('assignToSuggestion.canExecute', () => {
  it('erlaubt Drops nur auf der suggestion-Zone mit masterId', () => {
    const valid = makeCommandFixture({ zone: 'suggestion', masterId: 3 });
    const missingMaster = makeCommandFixture({ zone: 'suggestion' });
    const otherZone = makeCommandFixture({ zone: 'unassign', masterId: 3 });

    expect(assignToSuggestion.canExecute(valid.ctx)).toBe(true);
    expect(assignToSuggestion.canExecute(missingMaster.ctx)).toBe(false);
    expect(assignToSuggestion.canExecute(otherZone.ctx)).toBe(false);
  });

  it('verhindert das Zurückziehen eines Slaves auf seinen eigenen Master', () => {
    const selfDrop = makeCommandFixture(
      { zone: 'suggestion', masterId: 3 },
      { currentMasterId: 3 },
    );

    expect(assignToSuggestion.canExecute(selfDrop.ctx)).toBe(false);
  });

  it('erlaubt den Selbst-Drop im Bulk-Modus', () => {
    const bulkSelfDrop = makeCommandFixture(
      { zone: 'suggestion', masterId: 3 },
      { currentMasterId: 3 },
      true,
    );

    expect(assignToSuggestion.canExecute(bulkSelfDrop.ctx)).toBe(true);
  });
});

describe('assignToSuggestion.execute', () => {
  it('weist bei Bulk-Drop alle IDs dem Ziel-Master zu', async () => {
    const { ctx, calls } = makeCommandFixture({ zone: 'suggestion', masterId: 3 }, {}, true);

    await assignToSuggestion.execute(ctx);

    expect(calls).toEqual([{ name: 'doBulkAction', args: ['assign', [7, 8], 3] }]);
  });

  it('weist bei Einzel-Drop nur den gezogenen Slave zu', async () => {
    const { ctx, calls } = makeCommandFixture(
      { zone: 'suggestion', masterId: 3 },
      { slaveId: 42 },
    );

    await assignToSuggestion.execute(ctx);

    expect(calls).toEqual([{ name: 'doAssignSlave', args: [42, 3] }]);
  });
});
