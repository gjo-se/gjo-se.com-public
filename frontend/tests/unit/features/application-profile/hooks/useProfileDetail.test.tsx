/**
 * Tests: useProfileDetail
 *
 * Covers the mount load (incl. the 404 "no profile" and real error paths), the
 * full-payload per-field save (localized story merge) and the photo upload.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProfileDetail } from '@src/features/application-profile/hooks/useProfileDetail';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';

const PROFILE_URL = '/api/v1/admin/application-profile';
const PHOTO_URL = '/api/v1/admin/application-profile/photo';

const profile = {
  id: 1,
  fullName: 'Greg Example',
  email: 'greg@example.test',
  phone: '+49 30 1234567',
  location: 'Berlin',
  remote: 'hybrid',
  languages: 'de,en',
  photoUrl: null,
  headline: 'Developer',
  githubUrl: null,
  linkedinUrl: null,
  websiteUrl: null,
  hourlyRate: 90,
  hourlyRateCurrency: 'EUR',
  availableFrom: null,
  translations: { de: { story: 'DE' }, en: { story: 'EN' } },
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

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

describe('useProfileDetail', () => {
  it('loads the singleton profile on mount', async () => {
    stubFetch(() => jsonResponse(profile));

    const { result } = renderHook(() => useProfileDetail());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toEqual(profile);
    expect(result.current.error).toBeNull();
  });

  it('treats a 404 as "no profile yet" without an error', async () => {
    stubFetch(() => errorResponse(404, 'not found'));

    const { result } = renderHook(() => useProfileDetail());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('reports other load failures', async () => {
    stubFetch(() => errorResponse(500, 'boom'));

    const { result } = renderHook(() => useProfileDetail());

    await waitFor(() => expect(result.current.error).toBe('500: boom'));
    expect(result.current.profile).toBeNull();
  });

  it('sends the full profile payload with the changed field', async () => {
    const updated = { ...profile, headline: 'Lead Developer' };
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PUT' ? jsonResponse(updated) : jsonResponse(profile)
    ));
    const { result } = renderHook(() => useProfileDetail());
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    await act(async () => {
      await result.current.handleSave('headline', 'Lead Developer');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(String(put?.[0])).toContain(PROFILE_URL);
    const body = JSON.parse(String(put?.[1]?.body));
    expect(body).toMatchObject({
      full_name: 'Greg Example',
      email: 'greg@example.test',
      headline: 'Lead Developer',
      hourly_rate: 90,
    });
    expect(result.current.profile?.headline).toBe('Lead Developer');
  });

  it('merges a localized story into the complete translations map', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PUT' ? jsonResponse(profile) : jsonResponse(profile)
    ));
    const { result } = renderHook(() => useProfileDetail());
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    await act(async () => {
      await result.current.handleSave('story_de', 'Neue Story');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body)).translations).toEqual({
      de: { story: 'Neue Story' },
      en: { story: 'EN' },
    });
  });

  it('does not save before the profile is loaded', async () => {
    stubFetch(() => errorResponse(404, 'not found'));
    const { result } = renderHook(() => useProfileDetail());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSave('headline', 'Lead');
    });

    expect(result.current.profile).toBeNull();
  });

  it('uploads a photo and stores the returned profile', async () => {
    const withPhoto = { ...profile, photoUrl: 'https://cdn.test/photo.webp' };
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'POST' ? jsonResponse(withPhoto) : jsonResponse(profile)
    ));
    const { result } = renderHook(() => useProfileDetail());
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    await act(async () => {
      await result.current.uploadPhoto(new File(['x'], 'photo.png', { type: 'image/png' }));
    });

    expect(fetchSpy.mock.calls.some(([url, init]) => init?.method === 'POST' && String(url).includes(PHOTO_URL)))
      .toBe(true);
    expect(result.current.profile?.photoUrl).toBe('https://cdn.test/photo.webp');
    expect(result.current.uploading).toBe(false);
  });

  it('reports an upload failure', async () => {
    stubFetch((_url, init) => (
      init?.method === 'POST' ? errorResponse(413, 'too large') : jsonResponse(profile)
    ));
    const { result } = renderHook(() => useProfileDetail());
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    await act(async () => {
      await result.current.uploadPhoto(new File(['x'], 'photo.png', { type: 'image/png' }));
    });

    expect(result.current.error).toBe('413: too large');
    expect(result.current.uploading).toBe(false);
  });
});
