/**
 * Tests: usePdfDownload
 *
 * Verifies the download trigger (object URL, anchor download name, click,
 * cleanup) and the error path.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePdfDownload } from '@src/features/pdf/hooks/usePdfDownload';

import { blobResponse, errorResponse } from '../../helpers/fetchResponse';

beforeEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:pdf-1'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePdfDownload', () => {
  it('downloads the generated PDF under the given filename', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(blobResponse(new Blob(['pdf'])));
    const { result } = renderHook(() => usePdfDownload());

    await act(async () => {
      await result.current.downloadPdf('cv', { name: 'Ada' }, 'Lebenslauf.pdf');
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf-1');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reports a generation error and does not create an object URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(500, 'render failed'));
    const { result } = renderHook(() => usePdfDownload());

    await act(async () => {
      await result.current.downloadPdf('cv', {}, 'cv.pdf');
    });

    expect(result.current.error).toBe('500: render failed');
    expect(result.current.loading).toBe(false);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
