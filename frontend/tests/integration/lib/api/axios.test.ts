import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { api } from '@src/lib/api/axios';
import { worker } from '@src/mocks/browser';

describe('axios instance', () => {
  it('resolves relative paths against the api v1 base url', async () => {
    let pathname = '';
    worker.use(
      http.get('/api/v1/admin/llm/models', ({ request }) => {
        pathname = new URL(request.url).pathname;
        return HttpResponse.json([{ openrouter_id: 'openai/gpt-4' }]);
      }),
    );

    const response = await api.get<Array<{ openrouter_id: string }>>('/admin/llm/models');

    expect(pathname).toBe('/api/v1/admin/llm/models');
    expect(response.data[0].openrouter_id).toBe('openai/gpt-4');
  });

  it('keeps the shared cookie and base-url configuration', () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.baseURL).toBe(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`);
  });

  it('propagates a failing request to the caller', async () => {
    worker.use(
      http.get('/api/v1/admin/llm/models', () =>
        HttpResponse.json({ detail: 'Nicht autorisiert' }, { status: 401 }),
      ),
    );

    await expect(api.get('/admin/llm/models')).rejects.toThrow('401');
  });

  it('answers a raw fetch from the default MSW handler without a backend', async () => {
    const response = await fetch('/api/v1/admin/llm/models');

    expect(response.ok).toBe(true);

    const models = (await response.json()) as Array<{ openrouter_id: string }>;
    expect(models.map((model) => model.openrouter_id)).toEqual([
      'openai/gpt-4',
      'anthropic/claude-3-opus',
    ]);
  });
});
