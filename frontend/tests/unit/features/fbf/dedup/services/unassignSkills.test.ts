/**
 * Tests: unassignSkills command
 *
 * Guard requires the `unassign` zone and blocks a single drop for a slave
 * without a master; execute always performs the bulk unassign.
 */
import { describe, expect, it } from 'vitest';

import { unassignSkills } from '@src/features/fbf/dedup/services/unassignSkills';

import { makeCommandFixture } from '../support/commandContext';

describe('unassignSkills.canExecute', () => {
  it('erlaubt Einzel-Drops nur für Slaves mit aktuellem Master', () => {
    const withMaster = makeCommandFixture({ zone: 'unassign' }, { currentMasterId: 4 });
    const withoutMaster = makeCommandFixture({ zone: 'unassign' }, { currentMasterId: null });

    expect(unassignSkills.canExecute(withMaster.ctx)).toBe(true);
    expect(unassignSkills.canExecute(withoutMaster.ctx)).toBe(false);
  });

  it('erlaubt Bulk-Drops auch ohne aktuellen Master', () => {
    const bulk = makeCommandFixture({ zone: 'unassign' }, { currentMasterId: null }, true);

    expect(unassignSkills.canExecute(bulk.ctx)).toBe(true);
  });

  it('lehnt fremde Zonen ab', () => {
    const otherZone = makeCommandFixture({ zone: 'suggestion' }, { currentMasterId: 4 });

    expect(unassignSkills.canExecute(otherZone.ctx)).toBe(false);
  });
});

describe('unassignSkills.execute', () => {
  it('hebt bei Bulk-Drop die Zuordnung aller ausgewählten IDs auf', async () => {
    const { ctx, calls } = makeCommandFixture({ zone: 'unassign' }, {}, true);

    await unassignSkills.execute(ctx);

    expect(calls).toEqual([{ name: 'doBulkAction', args: ['unassign', [7, 8], undefined] }]);
  });
});
