/**
 * Tests: unassignToSP1 command
 *
 * Guard accepts only the `dissolve-group` zone for a dragged slave that
 * currently belongs to a master; execute unassigns the dragged selection.
 */
import { describe, expect, it } from 'vitest';

import { unassignToSP1 } from '@src/features/fbf/dedup/services/unassignToSP1';

import { makeCommandFixture } from '../support/commandContext';

describe('unassignToSP1.canExecute', () => {
  it('erlaubt Drops nur auf der dissolve-group-Zone', () => {
    const valid = makeCommandFixture({ zone: 'dissolve-group' }, { currentMasterId: 4 });
    const otherZone = makeCommandFixture({ zone: 'unassign' }, { currentMasterId: 4 });

    expect(unassignToSP1.canExecute(valid.ctx)).toBe(true);
    expect(unassignToSP1.canExecute(otherZone.ctx)).toBe(false);
  });

  it('lehnt Slaves ohne aktuellen Master ab', () => {
    const withoutMaster = makeCommandFixture(
      { zone: 'dissolve-group' },
      { currentMasterId: null },
    );

    expect(unassignToSP1.canExecute(withoutMaster.ctx)).toBe(false);
  });
});

describe('unassignToSP1.execute', () => {
  it('hebt die Zuordnung der ausgewählten IDs auf', async () => {
    const { ctx, calls } = makeCommandFixture({ zone: 'dissolve-group' }, {}, true);

    await unassignToSP1.execute(ctx);

    expect(calls).toEqual([{ name: 'doUnassignSkills', args: [[7, 8]] }]);
  });
});
