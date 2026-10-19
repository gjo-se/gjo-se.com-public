/**
 * Tests: usePortfolioService
 *
 * Verifies the locale-aware public requests for list, detail and proofs.
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import { usePortfolioService } from '@src/features/portfolio/hooks/usePortfolioService';

import { httpBoundary } from '../../helpers/httpBoundary';
import { createWrapper } from '../../helpers/wrappers';

beforeEach(() => {
  httpBoundary.reset();
});

describe('usePortfolioService', () => {
  it('requests the public list in the current locale', async () => {
    httpBoundary.on('get', '/public/portfolio?locale=de', () => [{ slug: 'ai' }]);
    const { result } = renderHook(() => usePortfolioService(), { wrapper: createWrapper() });

    await expect(result.current.listPortfolios()).resolves.toEqual([{ slug: 'ai' }]);
  });

  it('uses the English locale from the route', async () => {
    httpBoundary.on('get', '/public/portfolio/ai?locale=en', () => ({ slug: 'ai' }));
    const { result } = renderHook(() => usePortfolioService(), {
      wrapper: createWrapper({ path: '/en' }),
    });

    await expect(result.current.getPortfolio('ai')).resolves.toEqual({ slug: 'ai' });
  });

  it('requests the proofs of a portfolio with the locale', async () => {
    httpBoundary.on('get', '/public/portfolio/ai/proofs?locale=de', () => [{ id: 1 }]);
    const { result } = renderHook(() => usePortfolioService(), { wrapper: createWrapper() });

    await expect(result.current.getProofs('ai')).resolves.toEqual([{ id: 1 }]);
  });

  it('propagates request errors', async () => {
    httpBoundary.on('get', '/public/portfolio?locale=de', () => {
      throw new Error('offline');
    });
    const { result } = renderHook(() => usePortfolioService(), { wrapper: createWrapper() });

    await expect(result.current.listPortfolios()).rejects.toThrow('offline');
  });
});
