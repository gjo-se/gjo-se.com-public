/**
 * Tests: elkLayoutOptions
 *
 * Behaviour: grid snapping (rounding to 20-unit steps incl. the half-step
 * boundary) and the direction contract of the two layout presets.
 */

import { describe, expect, it } from 'vitest';

import {
  FLAT_LAYOUT_OPTIONS,
  LANDSCAPE_LAYOUT_OPTIONS,
  snap,
} from '@src/features/viscera/services/elkLayoutOptions';

describe('snap', () => {
  it('keeps values already on the grid unchanged', () => {
    expect(snap(0)).toBe(0);
    expect(snap(20)).toBe(20);
    expect(snap(140)).toBe(140);
  });

  it('rounds down below the half-step boundary', () => {
    expect(snap(9)).toBe(0);
    expect(snap(29)).toBe(20);
  });

  it('rounds up from the half-step boundary', () => {
    expect(snap(10)).toBe(20);
    expect(snap(11)).toBe(20);
    expect(snap(30)).toBe(40);
  });

  it('rounds negative values to the nearest grid line', () => {
    expect(snap(-11)).toBe(-20);
    expect(snap(-29)).toBe(-20);
  });
});

describe('layout presets', () => {
  it('lays out the landscape/system context top-down', () => {
    expect(LANDSCAPE_LAYOUT_OPTIONS['elk.algorithm']).toBe('layered');
    expect(LANDSCAPE_LAYOUT_OPTIONS['elk.direction']).toBe('DOWN');
  });

  it('lays out flat level views left-to-right', () => {
    expect(FLAT_LAYOUT_OPTIONS['elk.algorithm']).toBe('layered');
    expect(FLAT_LAYOUT_OPTIONS['elk.direction']).toBe('RIGHT');
  });

  it('keeps the node spacing contract of both presets', () => {
    expect(LANDSCAPE_LAYOUT_OPTIONS['elk.spacing.nodeNode']).toBe('90');
    expect(FLAT_LAYOUT_OPTIONS['elk.spacing.nodeNode']).toBe('70');
  });
});
