import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  fetchIconCounts,
  fetchTechnologies,
  fetchTechnologyCount,
  updateTechnology,
} from '@src/lib/api/technologyCatalog';
import { worker } from '@src/mocks/browser';

import { createCapture } from './testUtils';

const catalogPath = '/api/v1/admin/technology-catalog';

describe('technologyCatalog', () => {
  it('forwards the list filters to the technology models endpoint', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(`${catalogPath}/models`, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([{ id: 1, name: 'TypeScript' }]);
      }),
    );

    const technologies = await fetchTechnologies({
      q: 'Type',
      provider: 'Microsoft',
      type: 'language',
      limit: 20,
    });

    expect(parameters.latest()?.get('q')).toBe('Type');
    expect(parameters.latest()?.get('provider')).toBe('Microsoft');
    expect(parameters.latest()?.get('type')).toBe('language');
    expect(parameters.latest()?.get('limit')).toBe('20');
    expect(technologies[0].name).toBe('TypeScript');
  });

  it('unwraps the total from the count response', async () => {
    const total = await fetchTechnologyCount({ q: 'Type', status: 'active' });

    expect(total).toBe(1);
  });

  it('loads the icon statistics', async () => {
    const counts = await fetchIconCounts();

    expect(counts).toEqual({ total: 1, loaded: 0, missing: 1 });
  });

  it('patches a technology entry with its partial payload', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch(`${catalogPath}/models/:id`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 1, name: 'TypeScript 5' });
      }),
    );

    const technology = await updateTechnology(1, { name: 'TypeScript 5', status: 'active' });

    expect(receivedBody).toEqual({ name: 'TypeScript 5', status: 'active' });
    expect(technology.name).toBe('TypeScript 5');
  });

  it('surfaces a failing technology list as an error', async () => {
    worker.use(
      http.get(`${catalogPath}/models`, () =>
        HttpResponse.json({ detail: 'Katalog nicht erreichbar' }, { status: 500 }),
      ),
    );

    await expect(fetchTechnologies()).rejects.toThrow('500');
  });
});
