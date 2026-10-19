/**
 * Tests: useLocaleApi – current locale plus the query-append helper.
 *
 * Covers both separator classes (no query vs existing query) and both locales.
 */
import { createElement } from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useLocaleApi } from '@src/hooks/useLocaleApi';

import type { ReactNode } from 'react';

function renderAt(path: string) {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [path] }, children);

  return renderHook(() => useLocaleApi(), { wrapper });
}

describe('useLocaleApi', () => {
  it('reports German for a non-/en path', () => {
    const { result } = renderAt('/admin');

    expect(result.current.locale).toBe('de');
  });

  it('reports English for an /en path', () => {
    const { result } = renderAt('/en/admin');

    expect(result.current.locale).toBe('en');
  });

  it('appends the locale with ? when the URL has no query', () => {
    const { result } = renderAt('/en/admin');

    expect(result.current.withLocale('/api/items')).toBe('/api/items?locale=en');
  });

  it('appends the locale with & when the URL already has a query', () => {
    const { result } = renderAt('/admin');

    expect(result.current.withLocale('/api/items?page=2')).toBe('/api/items?page=2&locale=de');
  });
});
