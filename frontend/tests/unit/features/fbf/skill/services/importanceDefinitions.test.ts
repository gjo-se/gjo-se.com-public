/**
 * Tests: importance definition service
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
  fetchImportanceDefinitions,
  updateImportanceDefinition,
} from '@src/features/fbf/skill/services/importanceDefinitions';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('importance definitions', () => {
  it('lädt alle Definitionen', async () => {
    const definitions = [{ importance: 5, label: 'Kritisch', description: 'Muss' }];
    http.get.mockResolvedValue({ data: definitions });

    const result = await fetchImportanceDefinitions();

    expect(http.get.mock.calls[0]).toEqual(['/admin/fbf/importance-definition']);
    expect(result).toEqual(definitions);
  });

  it('aktualisiert nur die übergebenen Felder', async () => {
    const updated = { importance: 3, label: 'Mittel', description: 'Alt' };
    http.patch.mockResolvedValue({ data: updated });

    const result = await updateImportanceDefinition(3, { label: 'Mittel' });

    expect(http.patch.mock.calls[0]).toEqual([
      '/admin/fbf/importance-definition/3',
      { label: 'Mittel' },
    ]);
    expect(result).toEqual(updated);
  });

  it('reicht Fehler weiter', async () => {
    http.patch.mockRejectedValue(new Error('422 invalid'));

    await expect(updateImportanceDefinition(3, { label: '' })).rejects.toThrow('422 invalid');
  });
});
