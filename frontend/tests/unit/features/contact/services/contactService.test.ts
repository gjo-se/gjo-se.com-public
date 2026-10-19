/**
 * Tests: contactService
 *
 * Verifies the public token/submit calls and the admin list/delete mapping.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import {
  deleteContactSubmission,
  fetchContactToken,
  listContactSubmissions,
  submitContact,
} from '@src/features/contact/services/contactService';

import { httpBoundary } from '../../helpers/httpBoundary';

const payload = {
  name: 'Ada',
  email: 'ada@example.test',
  message: 'Hallo',
  lang: 'de' as const,
  token: 'signed-token',
};

beforeEach(() => {
  httpBoundary.reset();
});

describe('contactService', () => {
  it('unwraps the signed form token', async () => {
    httpBoundary.on('get', '/public/contact/token', () => ({ token: 'signed-token' }));

    await expect(fetchContactToken()).resolves.toBe('signed-token');
  });

  it('posts the submission payload unchanged', async () => {
    httpBoundary.on('post', '/public/contact', () => undefined);

    await submitContact(payload);

    expect(httpBoundary.calls[0]).toEqual({ method: 'post', url: '/public/contact', payload });
  });

  it('lists the admin submissions', async () => {
    httpBoundary.on('get', '/admin/contact', () => [{ id: 1 }]);

    await expect(listContactSubmissions()).resolves.toEqual([{ id: 1 }]);
  });

  it('deletes a submission by id', async () => {
    httpBoundary.on('delete', '/admin/contact/7', () => undefined);

    await expect(deleteContactSubmission(7)).resolves.toBeUndefined();
  });

  it('propagates submit errors', async () => {
    httpBoundary.on('post', '/public/contact', () => {
      throw new Error('429 rate limited');
    });

    await expect(submitContact(payload)).rejects.toThrow('429 rate limited');
  });
});
