/**
 * Tests: changeStatus command
 *
 * Covers the four accepted status zones, the rejection of all other zones
 * and the alias-count branch: a master with aliases changes the whole group,
 * everything else is a plain bulk status change.
 */
import { describe, expect, it } from 'vitest';

import { changeStatus } from '@src/features/fbf/dedup/services/changeStatus';

import { makeCommandFixture } from '../support/commandContext';

describe('changeStatus.canExecute', () => {
  it.each(['deprecated', 'pending', 'active', 'rejected'] as const)(
    'akzeptiert die Status-Zone %s',
    (zone) => {
      const { ctx } = makeCommandFixture({ zone });

      expect(changeStatus.canExecute(ctx)).toBe(true);
    },
  );

  it('lehnt andere Zonen und fehlende Zonen ab', () => {
    const dissolve = makeCommandFixture({ zone: 'dissolve-group' });
    const unassign = makeCommandFixture({ zone: 'unassign' });
    const none = makeCommandFixture({});

    expect(changeStatus.canExecute(dissolve.ctx)).toBe(false);
    expect(changeStatus.canExecute(unassign.ctx)).toBe(false);
    expect(changeStatus.canExecute(none.ctx)).toBe(false);
  });
});

describe('changeStatus.execute', () => {
  it('ändert bei einem Master mit Aliassen den Status der ganzen Gruppe', async () => {
    const { ctx, calls } = makeCommandFixture(
      { zone: 'active' },
      { slaveId: 42, aliasCount: 2 },
    );

    await changeStatus.execute(ctx);

    expect(calls).toEqual([{ name: 'doGroupStatus', args: [42, 'active'] }]);
  });

  it('nutzt bei aliasCount 0 die normale Bulk-Aktion', async () => {
    const { ctx, calls } = makeCommandFixture({ zone: 'active' }, { aliasCount: 0 }, true);

    await changeStatus.execute(ctx);

    expect(calls).toEqual([{ name: 'doBulkAction', args: ['active', [7, 8], undefined] }]);
  });

  it('nutzt ohne aliasCount die normale Bulk-Aktion', async () => {
    const { ctx, calls } = makeCommandFixture({ zone: 'deprecated' }, {}, true);

    await changeStatus.execute(ctx);

    expect(calls).toEqual([{ name: 'doBulkAction', args: ['deprecated', [7, 8], undefined] }]);
  });
});
