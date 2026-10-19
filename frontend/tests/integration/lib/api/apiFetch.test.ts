import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiFetch, apiFetchRaw, qs } from '@src/lib/api/apiFetch';
import { worker } from '@src/mocks/browser';

import { createCapture } from './testUtils';

interface ItemProbe {
  id: number;
  name: string;
}

describe('qs', () => {
  it('drops empty values and encodes the remaining parameters', () => {
    expect(qs({ q: 'data engineer', page: 2, skip: undefined, empty: '', none: null })).toBe(
      '?q=data+engineer&page=2',
    );
  });
});

describe('apiFetch', () => {
  it('parses the json body of a successful get call', async () => {
    worker.use(
      http.get('/api/v1/test/items', () =>
        HttpResponse.json([{ id: 1, name: 'TypeScript' }]),
      ),
    );

    const items = await apiFetch<ItemProbe[]>('/api/v1/test/items');

    expect(items).toEqual([{ id: 1, name: 'TypeScript' }]);
  });

  it('appends the query string to the request url', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get('/api/v1/test/items', ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([]);
      }),
    );

    await apiFetch('/api/v1/test/items', { query: { q: 'react', page: 2 } });

    expect(parameters.latest()?.get('q')).toBe('react');
    expect(parameters.latest()?.get('page')).toBe('2');
  });

  it('serializes a json body with the json content type', async () => {
    let receivedBody: unknown;
    const contentTypes = createCapture<string | null>();
    worker.use(
      http.post('/api/v1/test/items', async ({ request }) => {
        contentTypes.add(request.headers.get('content-type'));
        receivedBody = await request.json();
        return HttpResponse.json({ id: 2, name: 'React' }, { status: 201 });
      }),
    );

    const created = await apiFetch<ItemProbe>('/api/v1/test/items', {
      method: 'POST',
      body: { name: 'React' },
    });

    expect(contentTypes.latest()).toBe('application/json');
    expect(receivedBody).toEqual({ name: 'React' });
    expect(created.id).toBe(2);
  });

  it('returns undefined for a no-content response', async () => {
    worker.use(
      http.delete('/api/v1/test/items/1', () => new HttpResponse(null, { status: 204 })),
    );

    const result = await apiFetch('/api/v1/test/items/1', { method: 'DELETE' });

    expect(result).toBeUndefined();
  });

  it('returns a blob when blob parsing is requested', async () => {
    worker.use(
      http.get('/api/v1/test/report', () =>
        new HttpResponse('pdf-bytes', {
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );

    const blob = await apiFetch<Blob>('/api/v1/test/report', { parse: 'blob' });

    expect(blob.type).toBe('application/pdf');
    expect(await blob.text()).toBe('pdf-bytes');
  });

  it('sends a raw body without the json content type', async () => {
    let fileName = '';
    const contentTypes = createCapture<string | null>();
    worker.use(
      http.post('/api/v1/test/upload', async ({ request }) => {
        contentTypes.add(request.headers.get('content-type'));
        const data = await request.formData();
        fileName = String((data.get('file') as File).name);
        return HttpResponse.json({ id: 3, name: 'Upload' });
      }),
    );
    const formData = new FormData();
    formData.append('file', new File(['x'], 'photo.png', { type: 'image/png' }));

    await apiFetch('/api/v1/test/upload', { method: 'POST', rawBody: formData });

    expect(fileName).toBe('photo.png');
    expect(contentTypes.latest()?.startsWith('multipart/form-data')).toBe(true);
  });

  it('maps a json error detail to the error message', async () => {
    worker.use(
      http.get('/api/v1/test/items', () =>
        HttpResponse.json({ detail: 'Ungültige Anfrage' }, { status: 422 }),
      ),
    );

    await expect(apiFetch('/api/v1/test/items')).rejects.toThrow('422: Ungültige Anfrage');
  });

  it('falls back to the raw error text when the body is not json', async () => {
    worker.use(
      http.get('/api/v1/test/items', () => new HttpResponse('kaputt', { status: 500 })),
    );

    await expect(apiFetch('/api/v1/test/items')).rejects.toThrow('500: kaputt');
  });

  it('returns the raw response for callers that parse it themselves', async () => {
    worker.use(
      http.post('/api/v1/test/raw', () =>
        new HttpResponse('created', { status: 201 }),
      ),
    );

    const response = await apiFetchRaw('/api/v1/test/raw', { method: 'POST' });

    expect(response.status).toBe(201);
    expect(await response.text()).toBe('created');
  });
});
