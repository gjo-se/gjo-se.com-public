import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  createCareerEntry,
  createExperience,
  createFocusArea,
  deleteCareerEntry,
  getProfile,
  getPublicProfile,
  listApplicationProfileAssets,
  listCareerEntries,
  listExperiences,
  listFocusAreas,
  reorderCareerEntries,
  reorderExperiences,
  updateCareerEntry,
  updateFocusArea,
  uploadProfilePhoto,
  upsertProfile,
} from '@src/lib/api/applicationProfile';
import { worker } from '@src/mocks/browser';

import { createCapture } from './testUtils';

const profilePath = '/api/v1/admin/application-profile';

describe('applicationProfile', () => {
  it('loads the admin profile singleton', async () => {
    worker.use(
      http.get(profilePath, () =>
        HttpResponse.json({
          id: 1,
          fullName: 'Greg Fixture',
          headline: 'Fullstack Developer',
          createdAt: '2026-10-01T08:00:00Z',
          updatedAt: '2026-10-01T08:00:00Z',
        }),
      ),
    );

    const profile = await getProfile();

    expect(profile.fullName).toBe('Greg Fixture');
  });

  it('forwards the locale to the public profile endpoint', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get('/api/v1/public/application-profile', ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json({
          profile: {
            id: 1,
            fullName: 'Greg Fixture',
            createdAt: '2026-10-01T08:00:00Z',
            updatedAt: '2026-10-01T08:00:00Z',
          },
          career: [],
          languages: [],
          skills: [],
          focusAreas: [],
        });
      }),
    );

    const response = await getPublicProfile('en');

    expect(parameters.latest()?.get('locale')).toBe('en');
    expect(response.profile.fullName).toBe('Greg Fixture');
  });

  it('upserts the profile through the put endpoint', async () => {
    let receivedBody: unknown;
    worker.use(
      http.put(profilePath, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({
          id: 1,
          fullName: 'Greg Fixture',
          createdAt: '2026-10-01T08:00:00Z',
          updatedAt: '2026-10-01T08:00:00Z',
        });
      }),
    );

    const profile = await upsertProfile({ full_name: 'Greg Fixture' });

    expect(receivedBody).toEqual({ full_name: 'Greg Fixture' });
    expect(profile.id).toBe(1);
  });

  it('lists all career entries', async () => {
    const entries = await listCareerEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0].company).toBe('Example GmbH');
  });

  it('creates a career entry with its payload', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post(`${profilePath}/career`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 2, position: 'Data Engineer' });
      }),
    );

    const entry = await createCareerEntry({ position: 'Data Engineer', start_date: '2026-01-01' });

    expect(receivedBody).toEqual({ position: 'Data Engineer', start_date: '2026-01-01' });
    expect(entry.id).toBe(2);
  });

  it('updates a career entry through its put endpoint', async () => {
    let receivedBody: unknown;
    worker.use(
      http.put(`${profilePath}/career/:id`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 2, position: 'Staff Engineer' });
      }),
    );

    const entry = await updateCareerEntry(2, { position: 'Staff Engineer' });

    expect(receivedBody).toEqual({ position: 'Staff Engineer' });
    expect(entry.position).toBe('Staff Engineer');
  });

  it('reorders career entries with the ordered ids', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch(`${profilePath}/career/reorder`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json([]);
      }),
    );

    await reorderCareerEntries([3, 1, 2]);

    expect(receivedBody).toEqual({ ordered_ids: [3, 1, 2] });
  });

  it('deletes a career entry without a response body', async () => {
    let deletedId = '';
    worker.use(
      http.delete(`${profilePath}/career/:id`, ({ params }) => {
        deletedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await deleteCareerEntry(2);

    expect(result).toBeUndefined();
    expect(deletedId).toBe('2');
  });

  it('lists experience projects and creates a new one', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post(`${profilePath}/experience`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 3, position: 'Platform Engineer', decisions: [], proofs: [] });
      }),
    );

    const experiences = await listExperiences();
    const created = await createExperience({ position: 'Platform Engineer', start_date: '2025-01-01' });

    expect(experiences).toHaveLength(1);
    expect(receivedBody).toEqual({ position: 'Platform Engineer', start_date: '2025-01-01' });
    expect(created.id).toBe(3);
  });

  it('reorders experience projects with the ordered ids', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch(`${profilePath}/experience/reorder`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json([]);
      }),
    );

    await reorderExperiences([2, 1]);

    expect(receivedBody).toEqual({ ordered_ids: [2, 1] });
  });

  it('lists focus areas and creates a new one', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post(`${profilePath}/focus-areas`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 4, slug: 'platform' });
      }),
    );

    const areas = await listFocusAreas();
    const created = await createFocusArea({ slug: 'platform' });

    expect(areas).toHaveLength(1);
    expect(receivedBody).toEqual({ slug: 'platform' });
    expect(created.slug).toBe('platform');
  });

  it('updates a focus area through its put endpoint', async () => {
    let receivedBody: unknown;
    worker.use(
      http.put(`${profilePath}/focus-areas/:id`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 4, slug: 'platform' });
      }),
    );

    await updateFocusArea(4, { slug: 'platform-engineering' });

    expect(receivedBody).toEqual({ slug: 'platform-engineering' });
  });

  it('forwards the asset prefix to the object-store listing', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(`${profilePath}/assets`, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([]);
      }),
    );

    const assets = await listApplicationProfileAssets('profile/');

    expect(assets).toEqual([]);
    expect(parameters.latest()?.get('prefix')).toBe('profile/');
  });

  it('uploads the portrait photo as multipart form data', async () => {
    let fileName = '';
    worker.use(
      http.post(`${profilePath}/photo`, async ({ request }) => {
        const data = await request.formData();
        fileName = String((data.get('file') as File).name);
        return HttpResponse.json({
          id: 1,
          fullName: 'Greg Fixture',
          createdAt: '2026-10-01T08:00:00Z',
          updatedAt: '2026-10-01T08:00:00Z',
        });
      }),
    );

    const profile = await uploadProfilePhoto(
      new File(['x'], 'portrait.png', { type: 'image/png' }),
    );

    expect(fileName).toBe('portrait.png');
    expect(profile.id).toBe(1);
  });

  it('surfaces a failing profile request as an error', async () => {
    worker.use(
      http.get(profilePath, () =>
        HttpResponse.json({ detail: 'Profil nicht erreichbar' }, { status: 500 }),
      ),
    );

    await expect(getProfile()).rejects.toThrow('500');
  });
});
