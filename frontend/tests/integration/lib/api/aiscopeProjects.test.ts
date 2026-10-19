import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  deleteProject,
  estimateProjectHourlyRate,
  fetchMasterCandidates,
  fetchProjectById,
  fetchProjectCount,
  fetchProjectSiblings,
  fetchProjectSlaves,
  fetchProjects,
  recalculateAllScores,
  recalculateProjectScore,
  searchProjects,
  setProjectCanonical,
  setProjectHourlyRate,
  setProjectMyHourlyRate,
  setProjectMyStartDate,
  setProjectNotes,
  setProjectStatus,
  setProjectTitleNormalized,
  triggerSkillBackfill,
} from '@src/lib/api/aiscopeProjects';
import { worker } from '@src/mocks/browser';

import { createCapture } from './testUtils';

const projectsPath = '/api/v1/admin/fbf/projects';

describe('aiscopeProjects', () => {
  it('loads a filtered project page and returns the mapped rows', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(projectsPath, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([{ id: 7, title: 'Data Engineer', status: 'favorite' }]);
      }),
    );

    const projects = await fetchProjects({ status: 'favorite', limit: 25, offset: 50 });

    expect(parameters.latest()?.get('status')).toBe('favorite');
    expect(parameters.latest()?.get('limit')).toBe('25');
    expect(parameters.latest()?.get('offset')).toBe('50');
    expect(projects[0].title).toBe('Data Engineer');
  });

  it('returns the filtered total from the count endpoint', async () => {
    const total = await fetchProjectCount({ include_archived: false });

    expect(total).toBe(1);
  });

  it('loads a single project by id', async () => {
    const project = await fetchProjectById(1);

    expect(project.id).toBe(1);
    expect(project.city).toBe('Berlin');
  });

  it('patches the exclusive project status', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch(`${projectsPath}/1/status`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 1, title: 'Data Engineer', status: 'archived' });
      }),
    );

    const project = await setProjectStatus(1, 'archived');

    expect(receivedBody).toEqual({ status: 'archived' });
    expect(project.status).toBe('archived');
  });

  it('deletes a project without a response body', async () => {
    let deletedId = '';
    worker.use(
      http.delete(`${projectsPath}/:id`, ({ params }) => {
        deletedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await deleteProject(4);

    expect(result).toBeUndefined();
    expect(deletedId).toBe('4');
  });

  it('trims the search text before requesting master candidates', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(`${projectsPath}/master-candidates`, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([]);
      }),
    );

    await fetchMasterCandidates('  React  ', 7, 3);

    expect(parameters.latest()?.get('q')).toBe('React');
    expect(parameters.latest()?.get('exclude_id')).toBe('7');
    expect(parameters.latest()?.get('exclude_current_master_id')).toBe('3');
  });

  it('searches projects with the newest posting date first', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(projectsPath, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([]);
      }),
    );

    await searchProjects('TypeScript', 5);

    expect(parameters.latest()?.get('q')).toBe('TypeScript');
    expect(parameters.latest()?.get('limit')).toBe('5');
    expect(parameters.latest()?.get('sort_by')).toBe('posted_at');
    expect(parameters.latest()?.get('sort_order')).toBe('desc');
  });

  it('links a project to a canonical master project', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post(`${projectsPath}/7/set-canonical`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ status: 'linked', canonical_project_id: 3 });
      }),
    );

    const result = await setProjectCanonical(7, 3);

    expect(receivedBody).toEqual({ canonical_project_id: 3 });
    expect(result.canonical_project_id).toBe(3);
  });

  it('estimates the offer hourly rate without an LLM call', async () => {
    const estimate = await estimateProjectHourlyRate(1);

    expect(estimate.hourly_rate).toBe(95);
    expect(estimate.target_rate).toBe(95);
  });

  it('patches the estimated hourly rate', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch(`${projectsPath}/1/hourly-rate`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 1, title: 'Data Engineer', status: 'active' });
      }),
    );

    await setProjectHourlyRate(1, 95);

    expect(receivedBody).toEqual({ hourly_rate: 95 });
  });

  it('patches the curated hourly rate', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch(`${projectsPath}/1/my-hourly-rate`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 1, title: 'Data Engineer', status: 'active' });
      }),
    );

    await setProjectMyHourlyRate(1, 80);

    expect(receivedBody).toEqual({ my_hourly_rate: 80 });
  });

  it('patches the manual start date override', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch(`${projectsPath}/1/my-start-date`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 1, title: 'Data Engineer', status: 'active' });
      }),
    );

    await setProjectMyStartDate(1, '11/2026');

    expect(receivedBody).toEqual({ my_start_date: '11/2026' });
  });

  it('patches the free-text project notes', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch(`${projectsPath}/1/notes`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 1, title: 'Data Engineer', status: 'active' });
      }),
    );

    await setProjectNotes(1, 'Rückfrage offen');

    expect(receivedBody).toEqual({ notes: 'Rückfrage offen' });
  });

  it('patches the curated mail title', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch(`${projectsPath}/1/title-normalized`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 1, title: 'Data Engineer', status: 'active' });
      }),
    );

    await setProjectTitleNormalized(1, 'Data Engineer');

    expect(receivedBody).toEqual({ title_normalized: 'Data Engineer' });
  });

  it('loads the sibling ids of the current list view', async () => {
    const siblings = await fetchProjectSiblings(1, { status: 'favorite' });

    expect(siblings).toEqual({ prev_id: null, next_id: null });
  });

  it('loads the slave projects of a master', async () => {
    const slaves = await fetchProjectSlaves(1);

    expect(slaves).toEqual([]);
  });

  it('recalculates all scores and one project score', async () => {
    const all = await recalculateAllScores();
    const single = await recalculateProjectScore(1);

    expect(all).toEqual({ updated: 1, total: 1 });
    expect(single.match_score).toBe(82);
  });

  it('triggers the skill text-backfill', async () => {
    const result = await triggerSkillBackfill();

    expect(result.scanned).toBe(1);
    expect(result.linked).toBe(0);
  });

  it('surfaces a failing project list as an error', async () => {
    worker.use(
      http.get(projectsPath, () =>
        HttpResponse.json({ detail: 'Projekte nicht erreichbar' }, { status: 500 }),
      ),
    );

    await expect(fetchProjects({})).rejects.toThrow('500');
  });
});
