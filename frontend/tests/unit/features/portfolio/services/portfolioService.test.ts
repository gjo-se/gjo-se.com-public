/**
 * Tests: portfolioService
 *
 * Verifies the admin portfolio endpoints: encoded slugs, query params, bodies
 * and the proof sub-resource routes.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPortfolio,
  deletePortfolio,
  fetchAdminPortfolioDetail,
  fetchAdminPortfolios,
  listPortfolioAssets,
  reorderPortfolioProofs,
  reorderPortfolios,
  updatePortfolio,
  updatePortfolioProof,
  updatePortfolioTranslation,
} from '@src/features/portfolio/services/portfolioService';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';

const BASE = '/api/v1/admin/portfolio';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('portfolioService', () => {
  it('passes the list query params through', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]));

    await fetchAdminPortfolios({ limit: 20, offset: 40, q: 'ai', sort_by: 'sort', sort_order: 'asc' });

    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain(`${BASE}?`);
    expect(url).toContain('limit=20');
    expect(url).toContain('offset=40');
    expect(url).toContain('q=ai');
    expect(url).toContain('sort_by=sort');
  });

  it('encodes the slug for the detail request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ slug: 'a/b' }));

    await fetchAdminPortfolioDetail('a/b');

    expect(String(fetchSpy.mock.calls[0][0])).toContain(`${BASE}/a%2Fb`);
  });

  it('creates a portfolio with the given body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ slug: 'ai' }));
    const payload = { slug: 'ai', sort: 0, translations: { de: { title: '' } } };

    await createPortfolio(payload as never);

    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updates a portfolio and its translation', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ slug: 'ai' }));

    await updatePortfolio('ai', { sort: 2 } as never);
    await updatePortfolioTranslation('ai', 'en', { title: 'AI' });

    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/ai`);
    expect(fetchSpy.mock.calls[0][1]?.method).toBe('PUT');
    expect(fetchSpy.mock.calls[1][0]).toContain(`${BASE}/ai/translations/en`);
    expect(fetchSpy.mock.calls[1][1]?.body).toBe(JSON.stringify({ title: 'AI' }));
  });

  it('deletes a portfolio without a response body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 204, statusText: 'No Content', headers: new Headers(),
    } as unknown as Response);

    await expect(deletePortfolio('ai')).resolves.toBeUndefined();
    expect(fetchSpy.mock.calls[0][1]?.method).toBe('DELETE');
  });

  it('reorders portfolios by ordered slugs', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]));

    await reorderPortfolios(['b', 'a']);

    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/reorder`);
    expect(fetchSpy.mock.calls[0][1]?.body).toBe(JSON.stringify({ ordered_slugs: ['b', 'a'] }));
  });

  it('updates and reorders proofs within a portfolio', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ id: 2 }));

    await updatePortfolioProof('ai', 2, { priority: 'high' } as never);
    await reorderPortfolioProofs('ai', [3, 2]);

    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/ai/proofs/2`);
    expect(fetchSpy.mock.calls[0][1]?.body).toBe(JSON.stringify({ priority: 'high' }));
    expect(fetchSpy.mock.calls[1][0]).toContain(`${BASE}/ai/proofs/reorder`);
    expect(fetchSpy.mock.calls[1][1]?.body).toBe(JSON.stringify({ ordered_ids: [3, 2] }));
  });

  it('lists assets with the prefix query', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]));

    await listPortfolioAssets('portfolio/');

    expect(String(fetchSpy.mock.calls[0][0])).toContain(`${BASE}/assets?prefix=portfolio%2F`);
  });

  it('propagates the server detail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(404, 'missing'));

    await expect(fetchAdminPortfolioDetail('gone')).rejects.toThrow('404: missing');
  });
});
