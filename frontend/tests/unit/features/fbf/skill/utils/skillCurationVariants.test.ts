/**
 * Tests: skill curation variant helpers
 *
 * Styling contract for the inline-edit trigger and the sort dialog scroll area.
 */
import { describe, expect, it } from 'vitest';

import {
  cellEditTriggerVariants,
  sortDialogScrollVariants,
} from '@src/features/fbf/skill/utils/skillCurationVariants';

describe('skillCurationVariants', () => {
  it('liefert den Inline-Edit-Trigger-Stil', () => {
    expect(cellEditTriggerVariants()).toBe(
      'cursor-text select-none hover:text-blue-600 dark:hover:text-blue-400',
    );
  });

  it('liefert den scrollbaren Sort-Dialog-Stil', () => {
    expect(sortDialogScrollVariants()).toBe('flex max-h-96 flex-col gap-2 overflow-y-auto');
  });
});
