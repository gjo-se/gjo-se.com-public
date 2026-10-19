import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  fetchFreelancermapCount,
  fetchFreelancermapProject,
  fetchFreelancermapProjects,
} from '@src/lib/api/aiscopeFreelancermap';
import { worker } from '@src/mocks/browser';

import { createCapture } from './testUtils';

const fmPath = '/api/v1/admin/fbf/raw/freelancermap';

describe('aiscopeFreelancermap', () => {
  it('lists raw freelancermap entries through the shared fake', async () => {
    const projects = await fetchFreelancermapProjects({});

    expect(projects).toHaveLength(1);
    expect(projects[0].external_id).toBe('fm-1');
    expect(projects[0].title).toBe('Senior Fullstack Developer');
  });

  it('forwards search, term and paging filters to the list endpoint', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(fmPath, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([]);
      }),
    );

    const projects = await fetchFreelancermapProjects({
      q: 'Fullstack',
      search_term_id: 2,
      offset: 20,
      limit: 10,
      sort_order: 'desc',
    });

    expect(projects).toEqual([]);
    expect(parameters.latest()?.get('q')).toBe('Fullstack');
    expect(parameters.latest()?.get('search_term_id')).toBe('2');
    expect(parameters.latest()?.get('offset')).toBe('20');
    expect(parameters.latest()?.get('limit')).toBe('10');
    expect(parameters.latest()?.get('sort_order')).toBe('desc');
  });

  it('returns the total count of filtered raw entries', async () => {
    const total = await fetchFreelancermapCount({ q: 'React' });

    expect(total).toBe(1);
  });

  it('loads a single raw entry by its id', async () => {
    const project = await fetchFreelancermapProject(1);

    expect(project.id).toBe(1);
    expect(project.agency).toBe('Example GmbH');
  });

  it('surfaces a failing raw list as an error', async () => {
    worker.use(
      http.get(fmPath, () =>
        HttpResponse.json({ detail: 'Rohdaten nicht erreichbar' }, { status: 503 }),
      ),
    );

    await expect(fetchFreelancermapProjects({})).rejects.toThrow('503');
  });
});
