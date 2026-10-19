import { expectTypeOf, it } from 'vitest';

import type { ProjectStatus, SkillBadgeItem } from '@src/lib/api/aiscopeTypes';

it('pins the project status contract mirrored from the backend', () => {
  expectTypeOf<ProjectStatus>().toEqualTypeOf<'new' | 'favorite' | 'applied' | 'archived'>();
});

it('keeps the shared skill badge fields available to both consumers', () => {
  expectTypeOf<SkillBadgeItem>().toHaveProperty('id');
  expectTypeOf<SkillBadgeItem>().toHaveProperty('effective_importance');
  expectTypeOf<SkillBadgeItem>().toHaveProperty('level_public');
  expectTypeOf<SkillBadgeItem['level_public']>().toEqualTypeOf<number | null | undefined>();
});
