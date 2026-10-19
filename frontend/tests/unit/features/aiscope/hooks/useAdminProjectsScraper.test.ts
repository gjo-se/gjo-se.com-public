/**
 * Tests: useAdminProjectsScraper – beobachtbarer Zustand am Hook-Interface.
 *
 * Gefakt ist nur der I/O-Rand (`@src/lib/api/aiscope`), kein internes Modul.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminProjectsScraper } from '@src/features/aiscope/hooks/useAdminProjectsScraper';

const api = vi.hoisted(() => ({
  runScraper: vi.fn(),
  fetchScraperStatus: vi.fn(),
  runBatchDedup: vi.fn(),
  abortScraper: vi.fn(),
}));

vi.mock('@src/lib/api/aiscope', () => ({
  runScraper: api.runScraper,
  fetchScraperStatus: api.fetchScraperStatus,
  runBatchDedup: api.runBatchDedup,
  abortScraper: api.abortScraper,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderScraperHook(reload = vi.fn(), setPage = vi.fn()) {
  return renderHook(() => useAdminProjectsScraper({ reload, setPage }));
}

describe('useAdminProjectsScraper', () => {
  it('starts idle with empty input', () => {
    const { result } = renderScraperHook();

    expect(result.current.scraperStatus).toBe('idle');
    expect(result.current.maxResults).toBe('');
    expect(result.current.savedCount).toBeNull();
  });

  it('passes a parsed positive limit and stores the saved count after a sync run', async () => {
    api.runScraper.mockResolvedValue({ status: 'done', saved: 12 });
    const reload = vi.fn();
    const { result } = renderScraperHook(reload);

    act(() => result.current.setMaxResults('25'));

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(api.runScraper).toHaveBeenCalledWith(25);
    expect(result.current.scraperStatus).toBe('done');
    expect(result.current.savedCount).toBe(12);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('omits the limit for an invalid input', async () => {
    api.runScraper.mockResolvedValue({ status: 'done', saved: 0 });
    const { result } = renderScraperHook();

    act(() => result.current.setMaxResults('abc'));

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(api.runScraper).toHaveBeenCalledWith(undefined);
  });

  it('marks the run as failed for an error result', async () => {
    api.runScraper.mockResolvedValue({ status: 'error' });
    const { result } = renderScraperHook();

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(result.current.scraperStatus).toBe('error');
  });

  it('marks the run as failed when the API call throws', async () => {
    api.runScraper.mockRejectedValue(new Error('offline'));
    const { result } = renderScraperHook();

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(result.current.scraperStatus).toBe('error');
  });

  it('reports the number of deleted projects after a batch reset', async () => {
    api.runBatchDedup.mockResolvedValue({ status: 'completed', projects_deleted: 7 });
    const reload = vi.fn();
    const { result } = renderScraperHook(reload);

    await act(async () => {
      await result.current.handleBatchDedup();
    });

    expect(result.current.batchDedupStatus).toBe('done');
    expect(result.current.batchDedupResult).toBe('7 gelöscht');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('resets to page zero when the batch reset request fails', async () => {
    api.runBatchDedup.mockRejectedValue(new Error('offline'));
    const setPage = vi.fn();
    const { result } = renderScraperHook(vi.fn(), setPage);

    await act(async () => {
      await result.current.handleBatchDedup();
    });

    expect(result.current.batchDedupStatus).toBe('error');
    expect(setPage).toHaveBeenCalledWith(0);
  });

  it('confirms a dispatched Fargate job without polling', async () => {
    api.runScraper.mockResolvedValue({ status: 'launched', task_arn: 'arn:task' });
    const { result } = renderScraperHook();

    await act(async () => {
      await result.current.handleScrape();
    });

    await waitFor(() => expect(result.current.scraperStatus).toBe('done'));
    expect(result.current.savedCount).toBeNull();
    expect(api.fetchScraperStatus).not.toHaveBeenCalled();
  });

  it('confirms a dispatched job without a task ARN', async () => {
    api.runScraper.mockResolvedValue({ status: 'launched' });
    const { result } = renderScraperHook();

    await act(async () => {
      await result.current.handleScrape();
    });

    expect(result.current.scraperStatus).toBe('done');
  });
});

describe('useAdminProjectsScraper – async polling', () => {
  it('polls the async run through scraping, mapping and done', async () => {
    api.runScraper.mockResolvedValue({ status: 'started' });
    api.fetchScraperStatus
      .mockResolvedValueOnce({ phase: 'scraping', running: true, scraper_role: 'dev', scraper_roles_done: 1, scraper_roles_total: 2, scraper_page: 1, scraper_pages_total: 3, scraper_saved: 4 })
      .mockResolvedValueOnce({ phase: 'mapping', running: true, mapper_processed: 1, mapper_total: 2, mapper_new: 1, mapper_duplicates: 0, mapper_url_matches: 0, mapper_errors: 0 })
      .mockResolvedValueOnce({ phase: 'done', running: false, stats: { new_projects: 5, duplicates: 1, url_matches: 0, embedding_calls: 2, estimated_cost: 0.25 } });
    const reload = vi.fn();
    const { result } = renderScraperHook(reload);

    vi.useFakeTimers();
    await act(async () => { await result.current.handleScrape(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    vi.useRealTimers();

    expect(result.current.scraperStatus).toBe('done');
    expect(result.current.savedCount).toBe(5);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(api.fetchScraperStatus).toHaveBeenCalledTimes(3);
  });

  it('keeps polling after a transient status error', async () => {
    api.runScraper.mockResolvedValue({ status: 'started' });
    api.fetchScraperStatus
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ phase: 'done', running: false, stats: { estimated_cost: 0 } });
    const reload = vi.fn();
    const { result } = renderScraperHook(reload);

    vi.useFakeTimers();
    await act(async () => { await result.current.handleScrape(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    vi.useRealTimers();

    expect(result.current.scraperStatus).toBe('done');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reports a failed normalization phase', async () => {
    api.runScraper.mockResolvedValue({ status: 'started' });
    api.fetchScraperStatus.mockResolvedValue({ phase: 'error', running: false, error: 'boom' });
    const reload = vi.fn();
    const { result } = renderScraperHook(reload);

    vi.useFakeTimers();
    await act(async () => { await result.current.handleScrape(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    vi.useRealTimers();

    expect(result.current.scraperStatus).toBe('error');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('aborts the run from the live toast and stops polling', async () => {
    api.runScraper.mockResolvedValue({ status: 'started' });
    const loading = vi.spyOn(toast, 'loading').mockReturnValue('toast-1' as never);
    const { result } = renderScraperHook();

    await act(async () => { await result.current.handleScrape(); });
    const options = loading.mock.calls[0]?.[1] as { cancel?: { onClick: () => void } };
    act(() => { options.cancel?.onClick(); });

    expect(api.abortScraper).toHaveBeenCalledTimes(1);
    expect(result.current.scraperStatus).toBe('idle');
    expect(api.fetchScraperStatus).not.toHaveBeenCalled();
  });
});

describe('useAdminProjectsScraper – legacy sync results', () => {
  it('reports stats for a completed sync run', async () => {
    api.runScraper.mockResolvedValue({
      status: 'done',
      saved: 3,
      stats: { new_projects: 3, duplicates: 0, url_matches: 1, embedding_calls: 2, estimated_cost: 0 },
    });
    const { result } = renderScraperHook();

    await act(async () => { await result.current.handleScrape(); });

    expect(result.current.scraperStatus).toBe('done');
    expect(result.current.savedCount).toBe(3);
  });

  it('explains missing credentials for an empty run', async () => {
    api.runScraper.mockResolvedValue({ status: 'done', saved: 0, reason: 'no_credentials' });
    const { result } = renderScraperHook();

    await act(async () => { await result.current.handleScrape(); });

    expect(result.current.scraperStatus).toBe('done');
  });

  it('explains a disabled portal for an empty run', async () => {
    api.runScraper.mockResolvedValue({ status: 'done', saved: 0, skipped: ['freelancermap'] });
    const { result } = renderScraperHook();

    await act(async () => { await result.current.handleScrape(); });

    expect(result.current.scraperStatus).toBe('done');
  });

  it('explains an empty run without a specific reason', async () => {
    api.runScraper.mockResolvedValue({ status: 'done', saved: 0 });
    const { result } = renderScraperHook();

    await act(async () => { await result.current.handleScrape(); });

    expect(result.current.scraperStatus).toBe('done');
  });
});

describe('useAdminProjectsScraper – batch reset failure status', () => {
  it('marks a non-completed batch reset as failed', async () => {
    api.runBatchDedup.mockResolvedValue({ status: 'failed' });
    const reload = vi.fn();
    const { result } = renderScraperHook(reload);

    await act(async () => { await result.current.handleBatchDedup(); });

    expect(result.current.batchDedupStatus).toBe('error');
    expect(result.current.batchDedupResult).toBe('Fehler');
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('useAdminProjectsScraper – result variants', () => {
  it('uses the fallback description when the error phase has no message', async () => {
    api.runScraper.mockResolvedValue({ status: 'started' });
    api.fetchScraperStatus.mockResolvedValue({ phase: 'error', running: false });
    const { result } = renderScraperHook();

    vi.useFakeTimers();
    await act(async () => { await result.current.handleScrape(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    vi.useRealTimers();

    expect(result.current.scraperStatus).toBe('error');
  });

  it('reports costs and defaults for a sync run with sparse stats', async () => {
    api.runScraper.mockResolvedValue({
      status: 'done',
      saved: 2,
      stats: { estimated_cost: 0.5 },
    });
    const { result } = renderScraperHook();

    await act(async () => { await result.current.handleScrape(); });

    expect(result.current.scraperStatus).toBe('done');
    expect(result.current.savedCount).toBe(2);
  });

  it('handles a completed sync run without stats silently', async () => {
    api.runScraper.mockResolvedValue({ status: 'done', saved: 3 });
    const { result } = renderScraperHook();

    await act(async () => { await result.current.handleScrape(); });

    expect(result.current.scraperStatus).toBe('done');
    expect(result.current.savedCount).toBe(3);
  });
});
