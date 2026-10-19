/**
 * Tests: nodeSummaryService
 *
 * Behaviour: calls the read-only summary endpoint for the given node and
 * normalizes the response (missing description → null, missing skipped →
 * false, optional reason only when present). The HTTP client is doubled at
 * the `@src/lib/api/axios` boundary.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', () => ({
  api: { post: vi.fn() },
}));

import { api } from '@src/lib/api/axios';
import { generateNodeSummary } from '@src/features/viscera/services/nodeSummaryService';

const postMock = vi.mocked(api.post);

beforeEach(() => {
  postMock.mockReset();
});

describe('generateNodeSummary', () => {
  it('posts to the node summary endpoint and returns the description', async () => {
    postMock.mockResolvedValue({ data: { description: 'Handles requests', skipped: false } });

    const result = await generateNodeSummary('app.api');

    expect(postMock.mock.calls[0]).toEqual(['/admin/viscera/nodes/app.api/summary']);
    expect(result).toEqual({ description: 'Handles requests', skipped: false });
  });

  it('normalizes a missing description to null and a missing skipped flag to false', async () => {
    postMock.mockResolvedValue({ data: {} });

    const result = await generateNodeSummary('app.api');

    expect(result).toEqual({ description: null, skipped: false });
  });

  it('passes through a graceful skip reason', async () => {
    postMock.mockResolvedValue({
      data: { description: null, skipped: true, reason: 'llm_unavailable' },
    });

    const result = await generateNodeSummary('app.api');

    expect(result).toEqual({
      description: null,
      skipped: true,
      reason: 'llm_unavailable',
    });
  });

  it('omits the reason key when the backend sends an empty reason', async () => {
    postMock.mockResolvedValue({ data: { description: null, skipped: true, reason: '' } });

    const result = await generateNodeSummary('app.api');

    expect(result).not.toHaveProperty('reason');
  });

  it('propagates transport errors', async () => {
    postMock.mockRejectedValue(new Error('502 bad gateway'));

    await expect(generateNodeSummary('app.api')).rejects.toThrow('502 bad gateway');
  });
});
