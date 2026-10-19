/**
 * Tests: pdfService
 *
 * Verifies the generate request (endpoint, body) and the blob result.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generatePdf } from '@src/features/pdf/services/pdfService';

import { blobResponse, errorResponse } from '../../helpers/fetchResponse';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generatePdf', () => {
  it('posts the template and data and returns the blob', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(blobResponse(blob));

    const result = await generatePdf('cv', { name: 'Ada' });

    expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/v1/admin/pdf/generate');
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ template_name: 'cv', data: { name: 'Ada' } }),
    });
    await expect(result.text()).resolves.toBe('pdf');
  });

  it('propagates a generation error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(422, 'unknown template'));

    await expect(generatePdf('nope', {})).rejects.toThrow('422: unknown template');
  });
});
