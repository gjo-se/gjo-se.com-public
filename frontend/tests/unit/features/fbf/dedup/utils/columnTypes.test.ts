/**
 * Tests: ColumnDef – contract
 *
 * Declaration-only module: the contract is asserted at the type level plus a
 * runtime sample proving the declared shape is consumable.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { ColumnDef } from '@src/features/fbf/dedup/utils/columnTypes';

describe('ColumnDef – contract', () => {
  it('beschränkt die Column-ID auf die drei Board-Spalten', () => {
    expectTypeOf<ColumnDef['id']>().toEqualTypeOf<'slaves' | 'masters' | 'pinned-slaves'>();
  });

  it('verlangt einen Board-API-Spaltennamen und die Surface-Art', () => {
    expectTypeOf<ColumnDef['boardColumn']>().toEqualTypeOf<'masters' | 'slaves' | 'pinned'>();
    expectTypeOf<ColumnDef['surface']>().toEqualTypeOf<'direct' | 'deep'>();
    expectTypeOf<ColumnDef['canLead']>().toEqualTypeOf<boolean>();
  });

  it('akzeptiert eine minimale Spaltendefinition und ein optionales hasSlaves', () => {
    const minimal: ColumnDef = {
      id: 'pinned-slaves',
      label: 'Slaves',
      boardColumn: 'slaves',
      surface: 'deep',
      canLead: false,
    };
    const filtered: ColumnDef = {
      id: 'slaves',
      label: 'Master ohne Slaves',
      boardColumn: 'masters',
      hasSlaves: false,
      surface: 'direct',
      canLead: true,
    };

    expect(minimal.hasSlaves).toBeUndefined();
    expect(filtered.hasSlaves).toBe(false);
  });
});
