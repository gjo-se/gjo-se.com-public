/**
 * Tests: dissolveGroup command
 *
 * Guard accepts only the `dissolve-group` zone; bulk always passes, a single
 * drop only for a master that actually has aliases. Execute dissolves either
 * the selected masters or the dragged one.
 */
import { describe, expect, it } from 'vitest';

import { dissolveGroup } from '@src/features/fbf/dedup/services/dissolveGroup';

import { makeCommandFixture } from '../support/commandContext';

describe('dissolveGroup.canExecute', () => {
  it('erlaubt einen Einzel-Drop nur für Master mit Aliassen', () => {
    const withAliases = makeCommandFixture({ zone: 'dissolve-group' }, { aliasCount: 2 });
    const withoutAliases = makeCommandFixture({ zone: 'dissolve-group' }, { aliasCount: 0 });
    const missingCount = makeCommandFixture({ zone: 'dissolve-group' });

    expect(dissolveGroup.canExecute(withAliases.ctx)).toBe(true);
    expect(dissolveGroup.canExecute(withoutAliases.ctx)).toBe(false);
    expect(dissolveGroup.canExecute(missingCount.ctx)).toBe(false);
  });

  it('erlaubt Bulk-Drops unabhängig von der Alias-Anzahl', () => {
    const bulkWithoutAliases = makeCommandFixture({ zone: 'dissolve-group' }, { aliasCount: 0 }, true);

    expect(dissolveGroup.canExecute(bulkWithoutAliases.ctx)).toBe(true);
  });

  it('lehnt fremde Zonen ab', () => {
    const otherZone = makeCommandFixture({ zone: 'new-master' }, { aliasCount: 2 }, true);

    expect(dissolveGroup.canExecute(otherZone.ctx)).toBe(false);
  });
});

describe('dissolveGroup.execute', () => {
  it('löst bei Bulk-Drop alle ausgewählten Gruppen auf', async () => {
    const { ctx, calls } = makeCommandFixture({ zone: 'dissolve-group' }, {}, true);

    await dissolveGroup.execute(ctx);

    expect(calls).toEqual([{ name: 'doBulkDissolveGroups', args: [[7, 8]] }]);
  });

  it('löst bei Einzel-Drop die gezogene Gruppe auf', async () => {
    const { ctx, calls } = makeCommandFixture(
      { zone: 'dissolve-group' },
      { slaveId: 42, aliasCount: 3 },
    );

    await dissolveGroup.execute(ctx);

    expect(calls).toEqual([{ name: 'doDissolveGroup', args: [42] }]);
  });
});
