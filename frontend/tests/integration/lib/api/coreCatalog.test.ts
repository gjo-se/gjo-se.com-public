import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  createCoreStatus,
  createCoreTag,
  deleteCoreStatus,
  deleteCoreTag,
  fetchCoreStatuses,
  fetchCoreTags,
  fetchCoreTagUsage,
  fetchTaggableTags,
  setCoreStatus,
  setTaggableTags,
  updateCoreStatus,
} from '@src/lib/api/coreCatalog';
import { worker } from '@src/mocks/browser';

import { createCapture } from './testUtils';

describe('coreCatalog', () => {
  it('creates a core status with its payload', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/status', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 2, name: 'Pausiert', slug: 'paused' });
      }),
    );

    const status = await createCoreStatus({
      name: 'Pausiert',
      category: 'lifecycle',
      color_token: 'gray',
    });

    expect(receivedBody).toEqual({ name: 'Pausiert', category: 'lifecycle', color_token: 'gray' });
    expect(status.slug).toBe('paused');
  });

  it('creates a core tag with its payload', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/tagging/tags', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 2, name: 'Frontend', slug: 'frontend' });
      }),
    );

    const tag = await createCoreTag({ name: 'Frontend', category: 'domain', color_token: 'blue' });

    expect(receivedBody).toEqual({ name: 'Frontend', category: 'domain', color_token: 'blue' });
    expect(tag.name).toBe('Frontend');
  });

  it('forwards status filters to the status list', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get('/api/v1/admin/status', ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([]);
      }),
    );

    const statuses = await fetchCoreStatuses('lifecycle', 'fbf_project');

    expect(statuses).toEqual([]);
    expect(parameters.latest()?.get('category')).toBe('lifecycle');
    expect(parameters.latest()?.get('statusable_type')).toBe('fbf_project');
  });

  it('forwards tag filters to the tag list', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get('/api/v1/admin/tagging/tags', ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([]);
      }),
    );

    await fetchCoreTags('domain', 'front', 'fbf_skill');

    expect(parameters.latest()?.get('category')).toBe('domain');
    expect(parameters.latest()?.get('q')).toBe('front');
    expect(parameters.latest()?.get('taggable_type')).toBe('fbf_skill');
  });

  it('loads the usage summary of a tag', async () => {
    worker.use(
      http.get('/api/v1/admin/tagging/tags/1/usage', () =>
        HttpResponse.json([{ taggable_type: 'fbf_skill', count: 2 }]),
      ),
    );

    const usage = await fetchCoreTagUsage(1);

    expect(usage).toEqual([{ taggable_type: 'fbf_skill', count: 2 }]);
  });

  it('loads the tags assigned to a taggable entity', async () => {
    const tags = await fetchTaggableTags('fbf_skill', 1);

    expect(tags).toEqual([]);
  });

  it('assigns a core status with the status id', async () => {
    let receivedBody: unknown;
    worker.use(
      http.put('/api/v1/admin/status/statusable/:type/:id', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 1 });
      }),
    );

    await setCoreStatus('fbf_project', 7, 2);

    expect(receivedBody).toEqual({ status_id: 2 });
  });

  it('replaces the tag assignments of a taggable entity', async () => {
    let receivedBody: unknown;
    worker.use(
      http.put('/api/v1/admin/tagging/taggable/:type/:id', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json([]);
      }),
    );

    await setTaggableTags('fbf_skill', 7, [1, 3]);

    expect(receivedBody).toEqual({ tag_ids: [1, 3] });
  });

  it('updates a core status with its partial payload', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch('/api/v1/admin/status/:id', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 1, name: 'Inaktiv' });
      }),
    );

    const status = await updateCoreStatus(1, { name: 'Inaktiv' });

    expect(receivedBody).toEqual({ name: 'Inaktiv' });
    expect(status.name).toBe('Inaktiv');
  });

  it('deletes a status and a tag without a response body', async () => {
    const result = await deleteCoreStatus(1);
    const tagResult = await deleteCoreTag(1);

    expect(result).toBeUndefined();
    expect(tagResult).toBeUndefined();
  });

  it('surfaces a failing tag list as an error', async () => {
    worker.use(
      http.get('/api/v1/admin/tagging/tags', () =>
        HttpResponse.json({ detail: 'Tags nicht erreichbar' }, { status: 500 }),
      ),
    );

    await expect(fetchCoreTags()).rejects.toThrow('500');
  });
});
