import { HttpResponse, http } from 'msw';
import { expect, it, vi } from 'vitest';

import { api } from '@src/lib/api/axios';
import '@src/lib/api/axiosTrace';
import { worker } from '@src/mocks/browser';

interface TraceEvent {
  step: 'request' | 'response';
  method: string;
  url: string;
  status?: number;
}

interface TraceBatch {
  events: TraceEvent[];
}

it('batches request and response events to the trace endpoint', async () => {
  const batches: TraceBatch[] = [];
  worker.use(
    http.post('/api/v1/dev/fe-trace', async ({ request }) => {
      batches.push((await request.json()) as TraceBatch);
      return new HttpResponse(null, { status: 204 });
    }),
  );

  await api.get('/admin/llm/models');

  await vi.waitFor(() => expect(batches.length).toBeGreaterThan(0), { timeout: 4000 });

  const events = batches[0].events;
  expect(events.map((event) => event.step)).toEqual(['request', 'response']);
  expect(events[0].method).toBe('GET');
  expect(events[0].url).toBe('/admin/llm/models');
  expect(events[1].status).toBe(200);
});
