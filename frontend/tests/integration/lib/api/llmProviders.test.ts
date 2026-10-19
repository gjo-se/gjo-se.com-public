import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  fetchAdminLLMProviders,
  fetchLLMProviders,
  updateProviderApiBase,
} from '@src/lib/api/llmProviders';
import { worker } from '@src/mocks/browser';

describe('llmProviders', () => {
  it('lists the providers for the admin panel', async () => {
    const providers = await fetchAdminLLMProviders();

    expect(providers).toHaveLength(2);
    expect(providers[0].name).toBe('openai');
  });

  it('patches the api base and sends null for an empty value', async () => {
    const receivedBodies: unknown[] = [];
    worker.use(
      http.patch('/api/v1/admin/llm/providers/:id', async ({ request }) => {
        receivedBodies.push(await request.json());
        return HttpResponse.json({ id: 1, name: 'openai', display_name: 'OpenAI' });
      }),
    );

    await updateProviderApiBase(1, 'https://proxy.example.com/v1');
    await updateProviderApiBase(1, '');

    expect(receivedBodies).toEqual([
      { api_base: 'https://proxy.example.com/v1' },
      { api_base: null },
    ]);
  });

  it('lists the supported providers with their key status', async () => {
    worker.use(
      http.get('/api/v1/user/llm/providers', () =>
        HttpResponse.json([
          {
            id: 1,
            name: 'openai',
            display_name: 'OpenAI',
            is_supported: true,
            has_key: true,
            key_valid: true,
            key_label: 'Fixture Key',
          },
        ]),
      ),
    );

    const providers = await fetchLLMProviders();

    expect(providers[0].is_supported).toBe(true);
    expect(providers[0].key_valid).toBe(true);
  });

  it('surfaces a failing provider list as an error', async () => {
    worker.use(
      http.get('/api/v1/admin/llm/providers', () =>
        HttpResponse.json({ detail: 'Provider nicht erreichbar' }, { status: 500 }),
      ),
    );

    await expect(fetchAdminLLMProviders()).rejects.toThrow('500');
  });
});
