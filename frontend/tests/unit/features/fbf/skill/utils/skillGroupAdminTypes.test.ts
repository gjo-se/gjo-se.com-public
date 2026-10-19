/**
 * Tests: SkillGroupAdminRow – contract
 *
 * Declaration-only module: flattened locale labels, sort and priority are
 * asserted at the type level plus a runtime sample.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  SkillGroupAdminRow,
  SkillGroupPriority,
} from '@src/features/fbf/skill/utils/skillGroupAdminTypes';

describe('SkillGroupAdminRow – contract', () => {
  it('beschränkt die Priorität auf die drei Stufen', () => {
    expectTypeOf<SkillGroupPriority>().toEqualTypeOf<'high' | 'medium' | 'base'>();
  });

  it('verlangt flache, sprachspezifische Labels und den Skill-Count', () => {
    expectTypeOf<SkillGroupAdminRow['label_de']>().toEqualTypeOf<string>();
    expectTypeOf<SkillGroupAdminRow['label_en']>().toEqualTypeOf<string>();
    expectTypeOf<SkillGroupAdminRow['skillCount']>().toEqualTypeOf<number>();
  });

  it('akzeptiert eine vollständige Zeile', () => {
    const row: SkillGroupAdminRow = {
      id: 1,
      sort: 0,
      priority: 'high',
      label_de: 'Backend',
      label_en: 'Backend',
      skillCount: 3,
    };

    expect(row).toMatchObject({ id: 1, priority: 'high', skillCount: 3 });
  });
});
