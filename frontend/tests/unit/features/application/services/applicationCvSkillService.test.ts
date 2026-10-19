/**
 * Tests: applicationCvSkillService
 *
 * Verifies the batch-add, exclude and regenerate calls: endpoint, payload and
 * the "no body" contract of the default regenerate call.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addCvSkills,
  excludeCvSkill,
  regenerateSubmissionCv,
} from '@src/features/application/services/applicationCvSkillService';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';

const BASE = '/api/v1/admin/application-submissions';
const document = { id: 11, kind: 'cv', filename: 'cv.pdf' };

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('applicationCvSkillService', () => {
  it('posts the skill batch as one request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(document));

    const result = await addCvSkills(7, [{ name: 'TypeScript' }, { name: 'React' }]);

    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/7/cv-skills`);
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ items: [{ name: 'TypeScript' }, { name: 'React' }] }),
    });
    expect(result).toEqual(document);
  });

  it('posts the excluded skill name', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(document));

    await excludeCvSkill(7, 'COBOL');

    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/7/cv-skills/exclude`);
    expect(fetchSpy.mock.calls[0][1]?.body).toBe(JSON.stringify({ name: 'COBOL' }));
  });

  it('omits the body when the regenerate mode is inherited', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(document));

    await regenerateSubmissionCv(7);

    expect(fetchSpy.mock.calls[0][1]?.body).toBeUndefined();
    expect(fetchSpy.mock.calls[0][1]?.headers).toBeUndefined();
  });

  it('sends the default-skills flag when given', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(document));

    await regenerateSubmissionCv(7, true);

    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/7/cv-regenerate`);
    expect(fetchSpy.mock.calls[0][1]?.body).toBe(JSON.stringify({ use_default_skills: true }));
  });

  it('propagates the server detail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(409, 'cv locked'));

    await expect(addCvSkills(7, [{ name: 'React' }])).rejects.toThrow('409: cv locked');
  });
});
