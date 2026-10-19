/**
 * Tests: skill curation table params
 *
 * Registry defaults/serialisation and the shared list/count filter mapping
 * (empty values become undefined so they are dropped from the query).
 */
import { describe, expect, it } from 'vitest';

import {
  GROUP_PARAM,
  MASTER_PARAM,
  MIN_AVG_PARAM,
  MIN_IMP_PARAM,
  MIN_L1_PARAM,
  MIN_L2_PARAM,
  SKILL_REGISTRY,
  STATUS_PARAM,
  TABLE_KEY,
  TAG_PARAM,
  skillFilterParams,
} from '@src/features/fbf/skill/utils/skillCurationParams';

describe('skill curation table constants', () => {
  it('verwendet den festen Tabellen-Key und Param-Namen', () => {
    expect(TABLE_KEY).toBe('admin-skills');
    expect([STATUS_PARAM, TAG_PARAM, MASTER_PARAM]).toEqual(['status', 'tag', 'master']);
    expect([MIN_IMP_PARAM, MIN_L1_PARAM, MIN_L2_PARAM, MIN_AVG_PARAM, GROUP_PARAM]).toEqual([
      'minImp',
      'minL1',
      'minL2',
      'minAvg',
      'group',
    ]);
  });
});

describe('SKILL_REGISTRY', () => {
  it('setzt die fachlichen Defaults', () => {
    expect(SKILL_REGISTRY[STATUS_PARAM]?.default).toBe('active');
    expect(SKILL_REGISTRY[MASTER_PARAM]?.default).toBe('masters');
    expect(SKILL_REGISTRY[TAG_PARAM]?.default).toBe('');
    expect(SKILL_REGISTRY[GROUP_PARAM]?.default).toBe('');
  });

  it('serialisiert gesetzte Werte und entfernt leere Werte', () => {
    const serialize = SKILL_REGISTRY[STATUS_PARAM]?.serialize;

    expect(serialize?.('pending')).toBe('pending');
    expect(serialize?.('')).toBeUndefined();
    expect(serialize?.(undefined)).toBeUndefined();
  });

  it('serialisiert numerische Eingaben als String', () => {
    expect(SKILL_REGISTRY[MIN_L1_PARAM]?.serialize?.(2)).toBe('2');
  });
});

describe('skillFilterParams', () => {
  it('bildet alle Filter auf die API-Param-Namen ab', () => {
    expect(
      skillFilterParams('type', 'pending', 'lang', 'masters', '3', '2', '1', '4.5', '7'),
    ).toEqual({
      q: 'type',
      status: 'pending',
      tag: 'lang',
      master_filter: 'masters',
      min_importance: '3',
      min_level: '2',
      min_level_public: '1',
      min_avg_project_importance: '4.5',
      group_id: '7',
    });
  });

  it('entfernt leere Filter', () => {
    expect(skillFilterParams('', '', '', '', '', '', '', '', '')).toEqual({
      q: undefined,
      status: undefined,
      tag: undefined,
      master_filter: undefined,
      min_importance: undefined,
      min_level: undefined,
      min_level_public: undefined,
      min_avg_project_importance: undefined,
      group_id: undefined,
    });
  });
});
