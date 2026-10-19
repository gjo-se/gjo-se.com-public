/**
 * Tests: dedup board variant helpers
 *
 * The cva helpers expose their base class strings; these are the styling
 * contract consumed by the board components.
 */
import { describe, expect, it } from 'vitest';

import {
  boardEditTriggerVariants,
  columnSentinelVariants,
  columnShellVariants,
  dissolveOverlayVariants,
} from '@src/features/fbf/dedup/utils/dedupBoardVariants';

describe('dedupBoardVariants', () => {
  it('liefert den Trigger-Stil für Inline-Edit', () => {
    expect(boardEditTriggerVariants()).toBe(
      'cursor-text hover:text-blue-600 dark:hover:text-blue-400',
    );
  });

  it('liefert den Sentinel-Stil als dünne Trennlinie', () => {
    expect(columnSentinelVariants()).toBe('h-px');
  });

  it('liefert den Spalten-Shell-Stil als volle Höhe', () => {
    expect(columnShellVariants()).toBe('flex h-full flex-col');
  });

  it('liefert das Dissolve-Overlay als nicht-interaktives Badge', () => {
    expect(dissolveOverlayVariants()).toContain('pointer-events-none');
    expect(dissolveOverlayVariants()).toContain('bg-blue-500/80');
  });
});
