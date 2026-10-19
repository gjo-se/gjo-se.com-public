/**
 * Tests: adminProjectsTable – reine Tabellen-Verdrahtung am Public Interface.
 */
import { describe, expect, it } from 'vitest';

import {
  ENDCUSTOMER_PARAM,
  HAS_SKILLS_PARAM,
  JOB_ROLE_PARAM,
  MERGED_PARAM,
  MIN_SCORE_PARAM,
  PROJECTS_EXTRA_PARAMS,
  PROJECTS_TABLE_KEY,
  SORT_FIELD_MAP,
  readInitialJobRole,
} from '@src/features/aiscope/utils/adminProjectsTable';

describe('adminProjectsTable', () => {
  it('maps the UI column keys to the backend sort fields', () => {
    expect(SORT_FIELD_MAP.remotePercent).toBe('remote_percent');
    expect(SORT_FIELD_MAP.linkedCount).toBe('slave_count');
    expect(SORT_FIELD_MAP.matchScore).toBe('match_score');
    expect(SORT_FIELD_MAP.jobRole).toBe('job_role_name');
  });

  it('uses the shared projects table key', () => {
    expect(PROJECTS_TABLE_KEY).toBe('projects');
  });

  it('parses a numeric job role filter', () => {
    expect(PROJECTS_EXTRA_PARAMS[JOB_ROLE_PARAM].parse?.('12')).toBe(12);
    expect(PROJECTS_EXTRA_PARAMS[JOB_ROLE_PARAM].parse?.('')).toBeNull();
  });

  it('parses and serializes the nullable boolean filters', () => {
    expect(PROJECTS_EXTRA_PARAMS[ENDCUSTOMER_PARAM].parse?.('true')).toBe(true);
    expect(PROJECTS_EXTRA_PARAMS[ENDCUSTOMER_PARAM].parse?.('false')).toBe(false);
    expect(PROJECTS_EXTRA_PARAMS[ENDCUSTOMER_PARAM].parse?.('')).toBeNull();
    expect(PROJECTS_EXTRA_PARAMS[ENDCUSTOMER_PARAM].serialize?.(true)).toBe('true');
    expect(PROJECTS_EXTRA_PARAMS[ENDCUSTOMER_PARAM].serialize?.(null)).toBeUndefined();
    expect(PROJECTS_EXTRA_PARAMS[MERGED_PARAM].parse?.('true')).toBe(true);
    expect(PROJECTS_EXTRA_PARAMS[HAS_SKILLS_PARAM].parse?.('false')).toBe(false);
  });

  it('parses the minimum score filter', () => {
    expect(PROJECTS_EXTRA_PARAMS[MIN_SCORE_PARAM].parse?.('70')).toBe(70);
    expect(PROJECTS_EXTRA_PARAMS[MIN_SCORE_PARAM].serialize?.(70)).toBe('70');
    expect(PROJECTS_EXTRA_PARAMS[MIN_SCORE_PARAM].serialize?.(null)).toBeUndefined();
  });

  it('reads the initial job role from the URL', () => {
    window.history.replaceState(null, '', `/?${JOB_ROLE_PARAM}=8`);
    expect(readInitialJobRole()).toBe(8);

    window.history.replaceState(null, '', '/');
    expect(readInitialJobRole()).toBeNull();
  });
});
