/**
 * Tests: useCrudMutation
 *
 * Prüft das beobachtbare Verhalten am Public Interface: mutate-Ergebnis,
 * isPending, Navigation und die an den I/O-Rand übergebene Anfrage (Ziel +
 * Body). Gefakt werden nur der HTTP-Rand (`@src/lib/api/axios`) und das
 * npm-Paket react-router – beide mit Aufzeichnung statt Mock-Interaktion.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Boundary fake (HTTP-Rand `@src/lib/api/axios`) ────────────────────────
const http = vi.hoisted(() => {
  interface RecordedCall {
    method: string
    url: string
    body?: unknown
  }

  const calls: RecordedCall[] = [];
  let response: { data: unknown } = { data: undefined };
  let failure: unknown = null;
  let holding = false;
  let pendingResolve: (() => void) | null = null;

  const record =
    (method: string) =>
      (url: string, body?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method, url, body });
        if (holding) {
          holding = false;
          return new Promise<{ data: unknown }>((resolve) => {
            pendingResolve = () => resolve(response);
          });
        }
        if (failure !== null) return Promise.reject(failure);
        return Promise.resolve(response);
      };

  return {
    calls,
    api: {
      post: record('post'),
      put: record('put'),
      patch: record('patch'),
      delete: record('delete'),
    },
    reset(): void {
      calls.length = 0;
      response = { data: undefined };
      failure = null;
      holding = false;
      pendingResolve = null;
    },
    respondWith(data: unknown): void {
      response = { data };
    },
    failWith(error: unknown): void {
      failure = error;
    },
    holdNext(): void {
      holding = true;
    },
    releaseHeld(): void {
      pendingResolve?.();
    },
  };
});

vi.mock('@src/lib/api/axios', () => ({ default: http.api, api: http.api }));

// ── npm-Paket react-router: navigate mit Aufzeichnung ─────────────────────
const navigation = vi.hoisted(() => {
  const calls: string[] = [];
  return {
    calls,
    useNavigate: () => (to: string): void => {
      calls.push(to);
    },
  };
});

vi.mock('react-router', () => ({ useNavigate: navigation.useNavigate }));

import { useCrudMutation } from '@src/features/fbf/skill/services/useCrudMutation';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  http.reset();
  navigation.calls.length = 0;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCrudMutation', () => {
  it('gibt mutate + isPending zurück', () => {
    const { result } = renderHook(() =>
      useCrudMutation<{ name: string }>({
        method: 'post',
        endpoint: '/admin/test',
        navigateTo: '/admin',
      }),
    );

    expect(typeof result.current.mutate).toBe('function');
    expect(result.current.isPending).toBe(false);
  });

  it('ruft api.post mit statischem endpoint auf, navigiert und gibt null zurück', async () => {
    http.respondWith({ id: 1 });

    const { result } = renderHook(() =>
      useCrudMutation<{ name: string }>({
        method: 'post',
        endpoint: '/admin/test',
        navigateTo: '/admin',
      }),
    );

    let returnValue: string | null = null;

    await act(async () => {
      returnValue = await result.current.mutate({ name: 'Test' });
    });

    expect(http.calls[0]).toEqual({ method: 'post', url: '/admin/test', body: { name: 'Test' } });
    expect(navigation.calls).toEqual(['/admin']);
    expect(returnValue).toBeNull();
  });

  it('ruft api.put mit dynamischem endpoint auf und gibt null zurück', async () => {
    http.respondWith({ id: 1 });

    const { result } = renderHook(() =>
      useCrudMutation<{ name: string; slug: string }>({
        method: 'put',
        endpoint: (d) => `/admin/test/${d.slug}`,
        navigateTo: '/admin',
      }),
    );

    let returnValue: string | null = null;

    await act(async () => {
      returnValue = await result.current.mutate({ name: 'Test', slug: 'my-slug' });
    });

    expect(http.calls[0]).toEqual({
      method: 'put',
      url: '/admin/test/my-slug',
      body: { name: 'Test', slug: 'my-slug' },
    });
    expect(returnValue).toBeNull();
  });

  it('gibt die extrahierte Fehlermeldung zurück und navigiert nicht', async () => {
    http.failWith({ response: { data: { detail: 'Netzwerk-Fehler' } } });

    const { result } = renderHook(() =>
      useCrudMutation<{ name: string }>({
        method: 'post',
        endpoint: '/admin/test',
        navigateTo: '/admin',
      }),
    );

    let returnValue: string | null = null;

    await act(async () => {
      returnValue = await result.current.mutate({ name: 'Test' });
    });

    expect(returnValue).toBe('Netzwerk-Fehler');
    expect(navigation.calls).toEqual([]);
  });

  it('setzt isPending während der Mutation', async () => {
    http.holdNext();

    const { result } = renderHook(() =>
      useCrudMutation<{ name: string }>({
        method: 'post',
        endpoint: '/admin/test',
        navigateTo: '/admin',
      }),
    );

    expect(result.current.isPending).toBe(false);

    let mutatePromise: Promise<string | null> = Promise.resolve(null);
    await act(async () => {
      mutatePromise = result.current.mutate({ name: 'Test' });
    });

    expect(result.current.isPending).toBe(true);

    await act(async () => {
      http.releaseHeld();
      await mutatePromise;
    });

    expect(result.current.isPending).toBe(false);
  });

  it('nutzt statischen endpoint als String', async () => {
    http.respondWith({});

    const { result } = renderHook(() =>
      useCrudMutation<{ name: string }>({
        method: 'post',
        endpoint: '/admin/static',
        navigateTo: '/admin',
      }),
    );

    await act(async () => {
      await result.current.mutate({ name: 'Test' });
    });

    expect(http.calls[0]).toEqual({ method: 'post', url: '/admin/static', body: { name: 'Test' } });
  });

  it('nutzt dynamischen endpoint als Funktion', async () => {
    http.respondWith({});

    const { result } = renderHook(() =>
      useCrudMutation<{ id: number; name: string }>({
        method: 'put',
        endpoint: (d) => `/admin/items/${d.id}`,
        navigateTo: '/admin',
      }),
    );

    await act(async () => {
      await result.current.mutate({ id: 42, name: 'Test' });
    });

    expect(http.calls[0]).toEqual({
      method: 'put',
      url: '/admin/items/42',
      body: { id: 42, name: 'Test' },
    });
  });
});
