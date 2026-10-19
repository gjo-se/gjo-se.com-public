/**
 * Tests: useApplicationFlow
 *
 * Covers the load lifecycle (incl. the "no project" case), prepare in the
 * selected language, send, CV regeneration and setting the current version.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationFlow } from '@src/features/application/hooks/useApplicationFlow';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';

const submission = { id: 3, projectId: 9, subject: 'Bewerbung' };
const version = { id: 3, projectId: 9, isCurrent: true };

type FetchHandler = (url: string, init?: RequestInit) => Response

function stubFetch(handler: FetchHandler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    ((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(handler(String(input), init))) as never,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useApplicationFlow', () => {
  it('stays idle without a project id', () => {
    const fetchSpy = stubFetch(() => jsonResponse(null));

    const { result } = renderHook(() => useApplicationFlow(undefined));

    expect(result.current.submission).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('loads the submission and all application versions', async () => {
    stubFetch((url) => jsonResponse(url.includes('/applications') ? [version] : submission));

    const { result } = renderHook(() => useApplicationFlow(9));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.submission).toEqual(submission);
    expect(result.current.applications).toEqual([version]);
    expect(result.current.error).toBeNull();
  });

  it('prepares a submission in the selected language and reloads the versions', async () => {
    let prepared: unknown = null;
    stubFetch((url, init) => {
      if (url.endsWith('/prepare')) {
        prepared = JSON.parse(String(init?.body));
        return jsonResponse(submission);
      }
      return jsonResponse(url.includes('/applications') ? [version] : submission);
    });
    const { result } = renderHook(() => useApplicationFlow(9));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setLanguage('en'));
    await act(async () => {
      await result.current.prepare();
    });

    expect(prepared).toEqual({ project_id: 9, language: 'en' });
    expect(result.current.preparing).toBe(false);
  });

  it('sends the loaded submission and reports success', async () => {
    stubFetch((url) => jsonResponse(url.endsWith('/send') ? { ...submission, id: 3 } : submission));
    const { result } = renderHook(() => useApplicationFlow(9));
    await waitFor(() => expect(result.current.submission).not.toBeNull());

    let sent = false;
    await act(async () => {
      sent = await result.current.send();
    });

    expect(sent).toBe(true);
    expect(result.current.sending).toBe(false);
  });

  it('does not send when no submission is loaded', async () => {
    const fetchSpy = stubFetch((url) => errorResponse(url.includes('/by-project') ? 404 : 200, 'not found'));
    const { result } = renderHook(() => useApplicationFlow(9));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let sent = true;
    await act(async () => {
      sent = await result.current.send();
    });

    expect(sent).toBe(false);
    expect(fetchSpy.mock.calls.some(([url]) => String(url).endsWith('/send'))).toBe(false);
  });

  it('regenerates the CV and reloads the submission', async () => {
    stubFetch((url) => jsonResponse(url.includes('/applications') ? [version] : submission));
    const { result } = renderHook(() => useApplicationFlow(9));
    await waitFor(() => expect(result.current.submission).not.toBeNull());

    let regenerated = false;
    await act(async () => {
      regenerated = await result.current.regenerateCv(true);
    });

    expect(regenerated).toBe(true);
    expect(result.current.regenerating).toBe(false);
  });

  it('reports an error when regenerating fails', async () => {
    stubFetch((url) => (
      url.endsWith('/cv-regenerate') ? errorResponse(409, 'pdf locked') : jsonResponse(submission)
    ));
    const { result } = renderHook(() => useApplicationFlow(9));
    await waitFor(() => expect(result.current.submission).not.toBeNull());

    let regenerated = true;
    await act(async () => {
      regenerated = await result.current.regenerateCv();
    });

    expect(regenerated).toBe(false);
    expect(result.current.error).toBe('409: pdf locked');
  });
});
