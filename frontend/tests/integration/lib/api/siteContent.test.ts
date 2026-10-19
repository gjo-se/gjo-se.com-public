import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { fetchPublicSiteContent } from '@src/lib/api/siteContent';
import { worker } from '@src/mocks/browser';

describe('siteContent', () => {
  it('loads the public content map for a language', async () => {
    const content = await fetchPublicSiteContent('de');

    expect(content['home.hero.title']).toBe('Fixture-Text');
  });

  it('requests the language specific public content path', async () => {
    let pathname = '';
    worker.use(
      http.get('/api/v1/public/content/:lang', ({ request }) => {
        pathname = new URL(request.url).pathname;
        return HttpResponse.json({ 'home.hero.title': 'Hello' });
      }),
    );

    const content = await fetchPublicSiteContent('en');

    expect(pathname).toBe('/api/v1/public/content/en');
    expect(content['home.hero.title']).toBe('Hello');
  });

  it('surfaces a failing content request as an error', async () => {
    worker.use(
      http.get('/api/v1/public/content/:lang', () =>
        HttpResponse.json({ detail: 'Sprache unbekannt' }, { status: 404 }),
      ),
    );

    await expect(fetchPublicSiteContent('xx')).rejects.toThrow('404');
  });
});
