import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { streamDescriptionMerge } from '@src/lib/api/aiscopeMerge';
import { worker } from '@src/mocks/browser';

const mergePath = '/api/v1/admin/fbf/projects/7/merge-description';

describe('aiscopeMerge', () => {
  it('streams the merged text and extracts the call log meta line', async () => {
    const chunks: string[] = [];
    worker.use(
      http.post(mergePath, () =>
        new HttpResponse('{"type":"meta","call_log_id":42}\nZusammengefasster Text.', {
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    );

    const result = await streamDescriptionMerge(7, (accumulated) => {
      chunks.push(accumulated);
    });

    expect(result.text).toBe('Zusammengefasster Text.');
    expect(result.callLogMeta).toEqual({ call_log_id: 42 });
    expect(chunks.at(-1)).toBe('Zusammengefasster Text.');
  });

  it('throws the provider message from the stream error sentinel', async () => {
    worker.use(
      http.post(mergePath, () =>
        new HttpResponse('Teil [[LLM_ERROR:provider_error:Kaputt]]', {
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    );

    await expect(streamDescriptionMerge(7, () => undefined)).rejects.toThrow('Kaputt');
  });

  it('throws the detail of a 503 response before streaming', async () => {
    worker.use(
      http.post(mergePath, () =>
        HttpResponse.json({ detail: 'LLM nicht konfiguriert' }, { status: 503 }),
      ),
    );

    await expect(streamDescriptionMerge(7, () => undefined)).rejects.toThrow(
      'LLM nicht konfiguriert',
    );
  });

  it('reports a generic failure for any other non-ok status', async () => {
    worker.use(
      http.post(mergePath, () => new HttpResponse(null, { status: 500 })),
    );

    await expect(streamDescriptionMerge(7, () => undefined)).rejects.toThrow(
      'Merge fehlgeschlagen (500)',
    );
  });
});
