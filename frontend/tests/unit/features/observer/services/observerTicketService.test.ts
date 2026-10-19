/**
 * Tests: observerTicketService
 *
 * Covers ticket listing, the status patch and the push-test result mapping
 * (success, server detail, non-HTTP failure).
 */

import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import {
  fetchTickets,
  sendTestPush,
  updateTicketStatus,
} from '@src/features/observer/services/observerTicketService';

import { httpBoundary } from '../../helpers/httpBoundary';

const BASE = '/admin/llm/observer/tickets';
const PUSH = '/admin/llm/observer/push-test';

function axiosErrorWithDetail(detail: string): AxiosError {
  return new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    data: { detail },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: {} } as never,
  });
}

beforeEach(() => {
  httpBoundary.reset();
});

describe('observerTicketService', () => {
  it('loads the tickets', async () => {
    httpBoundary.on('get', BASE, () => [{ id: 1, status: 'open' }]);

    await expect(fetchTickets()).resolves.toEqual([{ id: 1, status: 'open' }]);
  });

  it('updates a ticket status via PATCH', async () => {
    httpBoundary.on('patch', `${BASE}/1`, () => ({ id: 1, status: 'done' }));

    await expect(updateTicketStatus(1, 'done')).resolves.toEqual({ id: 1, status: 'done' });
    expect(httpBoundary.calls[0].payload).toEqual({ status: 'done' });
  });

  it('returns the push-test result', async () => {
    httpBoundary.on('post', PUSH, () => ({ ok: true }));

    await expect(sendTestPush()).resolves.toEqual({ ok: true });
  });

  it('maps the server detail of a failed push test', async () => {
    httpBoundary.on('post', PUSH, () => {
      throw axiosErrorWithDetail('ntfy unreachable');
    });

    await expect(sendTestPush()).resolves.toEqual({ ok: false, error: 'ntfy unreachable' });
  });

  it('falls back to a generic push-test error for non-HTTP failures', async () => {
    httpBoundary.on('post', PUSH, () => {
      throw new Error('socket hang up');
    });

    await expect(sendTestPush()).resolves.toEqual({
      ok: false,
      error: 'Test-Push fehlgeschlagen',
    });
  });
});
