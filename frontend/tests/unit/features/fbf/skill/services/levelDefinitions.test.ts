/**
 * Tests: level definition service
 *
 * Read all definitions ordered by the backend; patch only the fields handed
 * in by the caller.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@src/lib/api/axios', () => ({ default: http, api: http }));

import {
  fetchLevelDefinitions,
  updateLevelDefinition,
} from '@src/features/fbf/skill/services/levelDefinitions';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('level definitions', () => {
  it('lädt alle Definitionen', async () => {
    const definitions = [{ level: 2, label: 'Fortgeschritten', description: 'Selbstständig' }];
    http.get.mockResolvedValue({ data: definitions });

    const result = await fetchLevelDefinitions();

    expect(http.get.mock.calls[0]).toEqual(['/admin/fbf/level-definition']);
    expect(result).toEqual(definitions);
  });

  it('aktualisiert nur die übergebenen Felder', async () => {
    const updated = { level: 2, label: 'Senior', description: 'Alt' };
    http.patch.mockResolvedValue({ data: updated });

    const result = await updateLevelDefinition(2, { label: 'Senior' });

    expect(http.patch.mock.calls[0]).toEqual([
      '/admin/fbf/level-definition/2',
      { label: 'Senior' },
    ]);
    expect(result).toEqual(updated);
  });

  it('reicht Fehler weiter', async () => {
    http.get.mockRejectedValue(new Error('offline'));

    await expect(fetchLevelDefinitions()).rejects.toThrow('offline');
  });
});
