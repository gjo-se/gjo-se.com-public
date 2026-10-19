/**
 * Tests: SkillGroupSkillSortDialogProps – contract
 *
 * Declaration-only props contract for the sort dialog: controlled open state,
 * required group identity and callback receiver.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { SkillGroupSkillSortDialogProps } from '@src/features/fbf/skill/utils/skillGroupSkillSortDialogTypes';

describe('SkillGroupSkillSortDialogProps – contract', () => {
  it('verlangt open, onOpenChange, groupId und groupLabel', () => {
    expectTypeOf<SkillGroupSkillSortDialogProps>().toEqualTypeOf<{
      open: boolean
      onOpenChange: (open: boolean) => void
      groupId: number
      groupLabel: string
    }>();
  });

  it('akzeptiert eine vollständige Props-Instanz', () => {
    const props: SkillGroupSkillSortDialogProps = {
      open: true,
      onOpenChange: () => undefined,
      groupId: 2,
      groupLabel: 'Backend',
    };

    expect(props).toMatchObject({ open: true, groupId: 2, groupLabel: 'Backend' });
  });
});
