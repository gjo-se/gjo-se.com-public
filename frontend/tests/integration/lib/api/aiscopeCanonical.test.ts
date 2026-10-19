import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  fetchCousins,
  setCanonical,
  switchCanonical,
  unlinkFreelancermapEntry,
} from '@src/lib/api/aiscopeCanonical';
import { worker } from '@src/mocks/browser';

const overridePath = '/api/v1/admin/fbf/project-freelancer-map';

describe('aiscopeCanonical', () => {
  it('loads cousin projects through the override endpoint', async () => {
    worker.use(
      http.post(`${overridePath}/7/cousins`, () =>
        HttpResponse.json({
          freelancermap_id: 7,
          cousins: [
            { project_id: 3, title: 'Data Engineer', city: 'Berlin', similarity: 0.91 },
          ],
        }),
      ),
    );

    const result = await fetchCousins(7);

    expect(result.freelancermap_id).toBe(7);
    expect(result.cousins).toEqual([
      { project_id: 3, title: 'Data Engineer', city: 'Berlin', similarity: 0.91 },
    ]);
  });

  it('sends the canonical project id when linking a raw entry', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post(`${overridePath}/7/set-canonical`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ status: 'linked', canonical_project_id: 3 });
      }),
    );

    const result = await setCanonical(7, 3);

    expect(receivedBody).toEqual({ canonical_project_id: 3 });
    expect(result.status).toBe('linked');
    expect(result.canonical_project_id).toBe(3);
  });

  it('clears the link when the canonical id is null', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post(`${overridePath}/7/set-canonical`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ status: 'unlinked', canonical_project_id: null });
      }),
    );

    await setCanonical(7, null);

    expect(receivedBody).toEqual({ canonical_project_id: null });
  });

  it('returns the old and new project ids after a canonical switch', async () => {
    worker.use(
      http.post(`${overridePath}/7/switch-canonical`, () =>
        HttpResponse.json({ status: 'switched', old_project_id: 3, new_project_id: 7 }),
      ),
    );

    const result = await switchCanonical(7);

    expect(result.old_project_id).toBe(3);
    expect(result.new_project_id).toBe(7);
  });

  it('detaches a raw entry from its canonical project', async () => {
    worker.use(
      http.post(`${overridePath}/7/unlink`, () =>
        HttpResponse.json({ status: 'unlinked', freelancermap_id: 7 }),
      ),
    );

    const result = await unlinkFreelancermapEntry(7);

    expect(result).toEqual({ status: 'unlinked', freelancermap_id: 7 });
  });

  it('surfaces a provider error instead of a partial result', async () => {
    worker.use(
      http.post(`${overridePath}/7/cousins`, () =>
        HttpResponse.json({ detail: 'Override fehlgeschlagen' }, { status: 500 }),
      ),
    );

    await expect(fetchCousins(7)).rejects.toThrow('500');
  });
});
