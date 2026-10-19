/**
 * Tests: applicationService
 *
 * Verifies the submission endpoints (read, prepare, send, status, current),
 * the 404-as-null read-by-project contract, query-string filtering, the
 * document/blob downloads and error propagation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteSubmission,
  fetchSubmissionApplications,
  fetchSubmissionCount,
  fetchSubmissions,
  getApplicationDocumentBlob,
  getGeneralCvBlob,
  getSubmission,
  getSubmissionByProject,
  prepareSubmission,
  sendSubmission,
  setCurrentSubmission,
  updateSubmissionStatus,
} from '@src/features/application/services/applicationService';

import { blobResponse, errorResponse, jsonResponse } from '../../helpers/fetchResponse';

const BASE = '/api/v1/admin/application-submissions';

const submission = { id: 3, projectId: 9, subject: 'Bewerbung' };

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('applicationService', () => {
  it('reads a submission by id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(submission));

    await expect(getSubmission(3)).resolves.toEqual(submission);
    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/3`);
  });

  it('returns null when the project has no submission yet', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(404, 'none'));

    await expect(getSubmissionByProject(9)).resolves.toBeNull();
  });

  it('returns the project submission when it exists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(submission));

    await expect(getSubmissionByProject(9)).resolves.toEqual(submission);
  });

  it('lists all application versions of a project', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([submission]));

    await expect(fetchSubmissionApplications(9)).resolves.toEqual([submission]);
    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/by-project/9/applications`);
  });

  it('prepares a submission with the chosen language', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(submission));

    await prepareSubmission(9, 'en');

    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/prepare`);
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ project_id: 9, language: 'en' }),
    });
  });

  it('sends a persisted submission', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(submission));

    await expect(sendSubmission(3)).resolves.toEqual(submission);
    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/3/send`);
    expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
  });

  it('marks a submission as current via PATCH', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(submission));

    await setCurrentSubmission(3);

    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/3/current`);
    expect(fetchSpy.mock.calls[0][1]?.method).toBe('PATCH');
  });

  it('sets the status with the new value in the body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(submission));

    await updateSubmissionStatus(3, 'sent');

    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/3/status`);
    expect(fetchSpy.mock.calls[0][1]?.body).toBe(JSON.stringify({ status: 'sent' }));
  });

  it('deletes a submission without a response body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
    } as unknown as Response);

    await expect(deleteSubmission(3)).resolves.toBeUndefined();
    expect(fetchSpy.mock.calls[0][1]?.method).toBe('DELETE');
  });

  it('drops empty query parameters from the list request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]));

    await fetchSubmissions({ q: 'a b', status: '', offset: 0, limit: 20 });

    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain('q=a+b');
    expect(url).toContain('limit=20');
    expect(url).not.toContain('status=');
    expect(url).not.toContain('sort_by=');
  });

  it('requests the filtered count', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(12));

    await expect(fetchSubmissionCount({ status: 'sent' })).resolves.toBe(12);
    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/count?status=sent`);
  });

  it('downloads a document as blob', async () => {
    const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(blobResponse(blob));

    const result = await getApplicationDocumentBlob(11);

    expect(fetchSpy.mock.calls[0][0]).toContain(`${BASE}/documents/11/download`);
    await expect(result.text()).resolves.toBe('pdf-bytes');
  });

  it('uses the server-provided filename for the general CV', async () => {
    const blob = new Blob(['cv']);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      blobResponse(blob, { 'content-disposition': 'attachment; filename="CV_Test.pdf"' }),
    );

    const result = await getGeneralCvBlob();

    expect(result.filename).toBe('CV_Test.pdf');
  });

  it('falls back to Lebenslauf.pdf without a content disposition', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(blobResponse(new Blob(['cv'])));

    await expect(getGeneralCvBlob()).resolves.toMatchObject({ filename: 'Lebenslauf.pdf' });
  });

  it('propagates illegal status transitions with status and detail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(409, 'illegal transition'));

    await expect(updateSubmissionStatus(3, 'draft')).rejects.toThrow('409: illegal transition');
  });
});
