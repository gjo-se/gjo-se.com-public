import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  abortScraper,
  fetchScraperStatus,
  runBatchDedup,
  runScraper,
} from '@src/lib/api/aiscopeScraper';
import { worker } from '@src/mocks/browser';

describe('aiscopeScraper', () => {
  it('starts the scraper without a body when no limits are given', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/fbf/scraper/run', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ status: 'done', saved: 1 });
      }),
    );

    const result = await runScraper();

    expect(receivedBody).toEqual({});
    expect(result.saved).toBe(1);
  });

  it('sends max results and the full-run flag when requested', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/fbf/scraper/run', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ status: 'launched', saved: 0, task_arn: 'arn-1' });
      }),
    );

    const result = await runScraper(40, true);

    expect(receivedBody).toEqual({ max_results: 40, force_full: true });
    expect(result.task_arn).toBe('arn-1');
  });

  it('polls the live scraper progress', async () => {
    const status = await fetchScraperStatus();

    expect(status.running).toBe(false);
    expect(status.phase).toBe('idle');
  });

  it('aborts a running scraper without a response body', async () => {
    let aborted = false;
    worker.use(
      http.post('/api/v1/admin/fbf/scraper/abort', () => {
        aborted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await abortScraper();

    expect(result).toBeUndefined();
    expect(aborted).toBe(true);
  });

  it('runs the complete batch dedup pipeline', async () => {
    const result = await runBatchDedup();

    expect(result.total_processed).toBe(1);
    expect(result.projects_deleted).toBe(0);
  });

  it('surfaces a failing status poll as an error', async () => {
    worker.use(
      http.get('/api/v1/admin/fbf/scraper/status', () =>
        HttpResponse.json({ detail: 'Status nicht erreichbar' }, { status: 500 }),
      ),
    );

    await expect(fetchScraperStatus()).rejects.toThrow('500');
  });
});
