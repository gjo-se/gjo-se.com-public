/**
 * Tests: editorSlice
 *
 * Behaviour: split ratios default to 0.5, are stored per scope and clamped to
 * the [0.2, 0.8] range at both boundaries.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

const store = () => useVisceraStore.getState();

beforeEach(() => {
  resetVisceraStore();
});

describe('editorSlice', () => {
  it('defaults both split ratios to 0.5', () => {
    expect(store().splitRatioAdr).toBe(0.5);
    expect(store().splitRatioYaml).toBe(0.5);
  });

  it('stores the ADR ratio independently from the YAML ratio', () => {
    store().setSplitRatio('adr', 0.3);

    expect(store().splitRatioAdr).toBe(0.3);
    expect(store().splitRatioYaml).toBe(0.5);
  });

  it('clamps values below the minimum to 0.2', () => {
    store().setSplitRatio('yaml', 0.1);

    expect(store().splitRatioYaml).toBe(0.2);
  });

  it('keeps the exact boundary values 0.2 and 0.8', () => {
    store().setSplitRatio('adr', 0.2);
    store().setSplitRatio('yaml', 0.8);

    expect(store().splitRatioAdr).toBe(0.2);
    expect(store().splitRatioYaml).toBe(0.8);
  });

  it('clamps values above the maximum to 0.8', () => {
    store().setSplitRatio('adr', 0.95);

    expect(store().splitRatioAdr).toBe(0.8);
  });
});
