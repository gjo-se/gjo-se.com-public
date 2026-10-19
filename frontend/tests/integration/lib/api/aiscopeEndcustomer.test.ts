import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  getPipelineResult,
  getProjectEndcustomerCandidates,
  postConfirmCandidate,
  postRejectCandidate,
} from '@src/lib/api/aiscopeEndcustomer';
import { worker } from '@src/mocks/browser';

describe('aiscopeEndcustomer', () => {
  it('loads the structured result of a finished pipeline run', async () => {
    worker.use(
      http.get('/api/v1/admin/tasks/task-1/pipeline-result', () =>
        HttpResponse.json({
          project_id: 7,
          phase: 'done',
          stopped_at_act: null,
          acts: {},
          candidates_fused: 2,
        }),
      ),
    );

    const result = await getPipelineResult('task-1');

    expect(result.project_id).toBe(7);
    expect(result.candidates_fused).toBe(2);
  });

  it('lists the endcustomer candidates of a project', async () => {
    worker.use(
      http.get('/api/v1/admin/fbf/projects/7/endcustomer-candidates', () =>
        HttpResponse.json([
          {
            id: 11,
            project_id: 7,
            company_name: 'Example GmbH',
            website: 'https://example.com',
            career_page_url: null,
            confidence: 0.82,
            source: 'web',
            career_page_description: null,
            similarity_to_project: 0.75,
            reasoning: null,
            status: 'pending',
            status_color_token: 'gray',
            created_at: '2026-10-01T08:00:00Z',
          },
        ]),
      ),
    );

    const candidates = await getProjectEndcustomerCandidates(7);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].company_name).toBe('Example GmbH');
  });

  it('confirms a candidate and returns the created crm ids', async () => {
    worker.use(
      http.post('/api/v1/admin/fbf/endcustomer-candidates/11/confirm', () =>
        HttpResponse.json({ company_id: 3, person_id: 9, slave_id: 4 }),
      ),
    );

    const result = await postConfirmCandidate(11);

    expect(result).toEqual({ company_id: 3, person_id: 9, slave_id: 4 });
  });

  it('rejects a candidate without returning a body', async () => {
    let rejectedId = '';
    worker.use(
      http.post('/api/v1/admin/fbf/endcustomer-candidates/:id/reject', ({ params }) => {
        rejectedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await postRejectCandidate(11);

    expect(result).toBeUndefined();
    expect(rejectedId).toBe('11');
  });

  it('surfaces a missing pipeline result as an error', async () => {
    worker.use(
      http.get('/api/v1/admin/tasks/unknown/pipeline-result', () =>
        HttpResponse.json({ detail: 'Task nicht gefunden' }, { status: 404 }),
      ),
    );

    await expect(getPipelineResult('unknown')).rejects.toThrow('404');
  });
});
