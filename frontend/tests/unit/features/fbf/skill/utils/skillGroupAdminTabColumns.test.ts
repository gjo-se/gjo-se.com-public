/**
 * Tests: skill group admin tab columns
 *
 * Static table contract: row height, priority options, column order/widths
 * and the ghost-row validator (label_de is required).
 */
import { describe, expect, it } from 'vitest';

import {
  GROUP_COLUMNS,
  GROUP_ROW_HEIGHT,
  PRIORITY_OPTIONS,
  validateGhost,
} from '@src/features/fbf/skill/utils/skillGroupAdminTabColumns';

describe('skill group admin tab constants', () => {
  it('nutzt eine feste Zeilenhöhe für die Drag-Ausrichtung', () => {
    expect(GROUP_ROW_HEIGHT).toBe(48);
  });

  it('bietet genau die drei Prioritäten high/medium/base', () => {
    expect(PRIORITY_OPTIONS).toEqual([
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'base', label: 'Base' },
    ]);
  });

  it('definiert die Spalten in fester Reihenfolge mit Breiten', () => {
    expect(GROUP_COLUMNS.map((column) => column.key)).toEqual([
      '_drag',
      'label_de',
      'label_en',
      'priority',
      '_actions',
    ]);
    expect(GROUP_COLUMNS.map((column) => column.width)).toEqual([
      '3%',
      '36%',
      '36%',
      '12%',
      '12%',
    ]);
  });

  it('markiert nur die kompakten Drag-/Action-Spalten als compact', () => {
    expect(GROUP_COLUMNS.filter((column) => column.compact).map((column) => column.key)).toEqual([
      '_drag',
      '_actions',
    ]);
  });
});

describe('validateGhost', () => {
  it('akzeptiert ein gefülltes label_de', () => {
    expect(validateGhost({ label_de: 'Backend' })).toBeNull();
  });

  it('meldet ein fehlendes label_de mit deutschem Pflichtfeld-Text', () => {
    expect(validateGhost({})).toBe('Label DE ist ein Pflichtfeld.');
  });

  it('behandelt reine Leerzeichen wie ein leeres Feld', () => {
    expect(validateGhost({ label_de: '   ' })).toBe('Label DE ist ein Pflichtfeld.');
  });
});
