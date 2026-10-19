import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  createSearchTerm,
  deleteSearchTerm,
  fetchActiveSearchTerms,
  fetchAllSearchTerms,
  updateSearchTerm,
} from '@src/lib/api/searchTerms';
import { worker } from '@src/mocks/browser';

describe('searchTerms', () => {
  it('lists all search terms for the admin panel', async () => {
    const terms = await fetchAllSearchTerms();

    expect(terms).toHaveLength(1);
    expect(terms[0].name).toBe('Fullstack');
  });

  it('lists the active search terms from the public endpoint', async () => {
    const terms = await fetchActiveSearchTerms();

    expect(terms).toHaveLength(1);
    expect(terms[0].name).toBe('Fullstack');
  });

  it('creates a search term with its name', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/fbf/search-term', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 2, name: 'React' });
      }),
    );

    const term = await createSearchTerm({ name: 'React' });

    expect(receivedBody).toEqual({ name: 'React' });
    expect(term.id).toBe(2);
  });

  it('updates a search term through its put endpoint', async () => {
    let receivedBody: unknown;
    worker.use(
      http.put('/api/v1/admin/fbf/search-term/:id', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 1, name: 'React Native' });
      }),
    );

    const term = await updateSearchTerm(1, { name: 'React Native' });

    expect(receivedBody).toEqual({ name: 'React Native' });
    expect(term.name).toBe('React Native');
  });

  it('deletes a search term without a response body', async () => {
    let deletedId = '';
    worker.use(
      http.delete('/api/v1/admin/fbf/search-term/:id', ({ params }) => {
        deletedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await deleteSearchTerm(1);

    expect(result).toBeUndefined();
    expect(deletedId).toBe('1');
  });

  it('surfaces a failing search term list as an error', async () => {
    worker.use(
      http.get('/api/v1/admin/fbf/search-term', () =>
        HttpResponse.json({ detail: 'Suchbegriffe nicht erreichbar' }, { status: 500 }),
      ),
    );

    await expect(fetchAllSearchTerms()).rejects.toThrow('500');
  });
});
