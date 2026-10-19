/**
 * Tests: useErrorReporter – global error / rejection reporting at the RUM boundary.
 *
 * The HTTP boundary is observed with a fetch spy (no real network); the payload
 * shape is the public RUM contract.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useErrorReporter } from '@src/lib/useErrorReporter';

/** Batch size that forces an immediate flush in the RUM sender. */
const FLUSH_THRESHOLD = 20;

interface MetricPayload {
  events: {
    type: string;
    name?: string;
    value: number;
    page: string;
    ts: string;
    ctx?: Record<string, unknown>;
  }[];
}

/**
 * Parses the metric payload of the n-th recorded request body.
 *
 * @param spy - The fetch spy.
 * @param callIndex - Zero-based request index.
 * @returns Parsed RUM payload.
 */
function payloadOf(spy: ReturnType<typeof vi.spyOn>, callIndex = 0): MetricPayload {
  const body = spy.mock.calls[callIndex][1]?.body;

  return JSON.parse(String(body)) as MetricPayload;
}

/**
 * Dispatches a global error event n times to reach the flush threshold.
 *
 * @param message - Error message.
 * @param times - Number of events to dispatch.
 */
function dispatchErrors(message: string, times = FLUSH_THRESHOLD): void {
  for (let index = 0; index < times; index += 1) {
    window.dispatchEvent(new ErrorEvent('error', { message, error: new Error(message) }));
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useErrorReporter', () => {
  it('meldet globale Error-Events als Fehler-Metrik', () => {
    const requestSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    renderHook(() => useErrorReporter());

    dispatchErrors('boom');

    const { events } = payloadOf(requestSpy);
    expect(events).toHaveLength(FLUSH_THRESHOLD);
    expect(events[0]).toMatchObject({ type: 'error', name: 'boom', value: 0, page: '/' });
    expect(typeof events[0].ctx?.stack).toBe('string');
  });

  it('verpackt einen Nicht-Error-Rejection-Grund in einen Fehler', () => {
    const requestSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    renderHook(() => useErrorReporter());

    for (let index = 0; index < FLUSH_THRESHOLD; index += 1) {
      const rejection = new Event('unhandledrejection');
      Object.defineProperty(rejection, 'reason', { value: 'kaputt' });
      window.dispatchEvent(rejection);
    }

    const { events } = payloadOf(requestSpy);
    expect(events[0]).toMatchObject({ type: 'error', name: 'kaputt' });
  });

  it('entfernt die globalen Listener beim Unmount', () => {
    const requestSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    const { unmount } = renderHook(() => useErrorReporter());

    unmount();
    for (let index = 0; index < FLUSH_THRESHOLD; index += 1) {
      window.dispatchEvent(new Event('error'));
    }

    expect(requestSpy).toHaveBeenCalledTimes(0);
  });
});
