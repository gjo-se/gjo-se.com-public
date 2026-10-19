/**
 * Tests: applicationScoreService
 *
 * Verifies the score endpoints: latest-by-project/-submission treat 404 as
 * "no run", the history is returned as-is, and a started run posts its body.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchLatestScoreByProject,
  fetchLatestScoreBySubmission,
  fetchScoreHistory,
  fetchScoreRun,
  startScoreRun,
} from '@src/features/application/services/applicationScoreService';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';

const BASE = '/api/v1/admin/application-score';

const run = { id: 5, totalScore: 72, verdict: 'borderline' };

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('applicationScoreService', () => {
  it('returns null for a missing latest project run (404)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(404, 'not found'));

    await expect(fetchLatestScoreByProject(9)).resolves.toBeNull();
  });

  it('returns the latest project run', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(run));

    await expect(fetchLatestScoreByProject(9)).resolves.toEqual(run);
    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/by-project/9/latest`);
  });

  it('returns null for a missing latest submission run (404)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(404, 'not found'));

    await expect(fetchLatestScoreBySubmission(3)).resolves.toBeNull();
  });

  it('loads the submission history', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([run]));

    await expect(fetchScoreHistory(3)).resolves.toEqual([run]);
    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/by-submission/3`);
  });

  it('loads a run by id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(run));

    await expect(fetchScoreRun(5)).resolves.toEqual(run);
    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/5`);
  });

  it('posts the start body and returns the run detail', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(run));

    await expect(startScoreRun({ submission_id: 3 })).resolves.toEqual(run);
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ submission_id: 3 }),
    });
  });

  it('surfaces the status and detail on a rejected run', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(422, 'no description'));

    await expect(startScoreRun({ project_id: 1 })).rejects.toThrow('422: no description');
  });
});
