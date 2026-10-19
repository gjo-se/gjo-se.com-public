/**
 * Tests: activateAsMaster command
 *
 * Behaviour at the public command interface: the guard accepts only the
 * `new-master` drop zone; bulk drops activate the selected ids, a single
 * drop activates the dragged slave as its own master.
 */
import { describe, expect, it } from 'vitest';

import { activateAsMaster } from '@src/features/fbf/dedup/services/activateAsMaster';

import { makeCommandFixture } from '../support/commandContext';

describe('activateAsMaster.canExecute', () => {
  it('erlaubt nur Drops auf der new-master-Zone', () => {
    const onZone = makeCommandFixture({ zone: 'new-master' });
    const onSuggestion = makeCommandFixture({ zone: 'suggestion' });
    const withoutZone = makeCommandFixture({});

    expect(activateAsMaster.canExecute(onZone.ctx)).toBe(true);
    expect(activateAsMaster.canExecute(onSuggestion.ctx)).toBe(false);
    expect(activateAsMaster.canExecute(withoutZone.ctx)).toBe(false);
  });
});

describe('activateAsMaster.execute', () => {
  it('aktiviert bei Bulk-Drop alle ausgewählten IDs', async () => {
    const { ctx, calls } = makeCommandFixture({ zone: 'new-master' }, {}, true);

    await activateAsMaster.execute(ctx);

    expect(calls).toEqual([{ name: 'doBulkAction', args: ['activate', [7, 8], undefined] }]);
  });

  it('aktiviert bei Einzel-Drop den gezogenen Slave ohne zusätzliche Slaves', async () => {
    const { ctx, calls } = makeCommandFixture({ zone: 'new-master' }, { slaveId: 42 });

    await activateAsMaster.execute(ctx);

    expect(calls).toEqual([{ name: 'doActivateMaster', args: [42, []] }]);
  });
});
