import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { inlineExplain } from '@src/lib/api/aiscopeLlm';
import { worker } from '@src/mocks/browser';

describe('aiscopeLlm', () => {
  it('posts the term and context to the inline explanation endpoint', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/llm/inline-explain', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ explanation: 'Fixture-Erklärung.', call_log_id: 12 });
      }),
    );

    const result = await inlineExplain({ term: 'SSE', context: 'Streaming im Browser' });

    expect(receivedBody).toEqual({ term: 'SSE', context: 'Streaming im Browser' });
    expect(result.explanation).toBe('Fixture-Erklärung.');
    expect(result.call_log_id).toBe(12);
  });

  it('surfaces a failing explanation call as an error', async () => {
    worker.use(
      http.post('/api/v1/admin/llm/inline-explain', () =>
        HttpResponse.json({ detail: 'LLM nicht konfiguriert' }, { status: 503 }),
      ),
    );

    await expect(
      inlineExplain({ term: 'SSE', context: 'Streaming im Browser' }),
    ).rejects.toThrow('503');
  });
});
