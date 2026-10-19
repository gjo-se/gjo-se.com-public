/**
 * Tests: siteContentService
 *
 * Verifies the list request and the encoded key/language update path.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import {
  fetchSiteContent,
  updateSiteContentValue,
} from '@src/features/site-content/services/siteContentService';

import { httpBoundary } from '../../helpers/httpBoundary';

const BASE = '/admin/content';

beforeEach(() => {
  httpBoundary.reset();
});

describe('siteContentService', () => {
  it('loads all site content rows', async () => {
    httpBoundary.on('get', BASE, () => [{ key: 'home.title', language: 'de', value: 'Titel' }]);

    await expect(fetchSiteContent()).resolves.toEqual([
      { key: 'home.title', language: 'de', value: 'Titel' },
    ]);
  });

  it('encodes key and language in the update path', async () => {
    httpBoundary.on('put', `${BASE}/home%2Ftitle/de`, () => ({ key: 'home/title', language: 'de', value: 'Neu' }));

    await updateSiteContentValue('home/title', 'de', 'Neu');

    expect(httpBoundary.calls[0]).toEqual({
      method: 'put',
      url: `${BASE}/home%2Ftitle/de`,
      payload: { value: 'Neu' },
    });
  });

  it('propagates update errors', async () => {
    httpBoundary.on('put', `${BASE}/home.title/de`, () => {
      throw new Error('403 forbidden');
    });

    await expect(updateSiteContentValue('home.title', 'de', 'x')).rejects.toThrow('403 forbidden');
  });
});
