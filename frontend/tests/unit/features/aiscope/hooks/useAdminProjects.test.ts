/**
 * Tests: useAdminProjects
 *
 * Prüft das beobachtbare Verhalten am Public Interface (Spalten + Tabellen-
 * Zustand). Die internen Hooks/Components laufen echt (kein vi.mock interner
 * Module); gefakt wird nur der I/O-Rand (@src/lib/api/**) und das npm-Paket
 * react-router.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminProjects } from '@src/features/aiscope/hooks/useAdminProjects';

// ── Boundary fakes (I/O edge) ────────────────────────────────────────────
// @src/lib/api/** ist der zulässige Boundary-Fake (kein Interna-Patch).
vi.mock('@src/lib/api/aiscope', () => ({
  fetchProjects: vi.fn().mockResolvedValue([]),
  fetchProjectCount: vi.fn().mockResolvedValue(0),
  setProjectStatus: vi.fn().mockResolvedValue({}),
  runScraper: vi.fn().mockResolvedValue({ status: 'done', saved: 0 }),
  fetchScraperStatus: vi.fn().mockResolvedValue({ running: false, phase: 'idle' }),
  runBatchDedup: vi.fn().mockResolvedValue({ status: 'completed', projects_deleted: 0 }),
  abortScraper: vi.fn(),
}));

vi.mock('@src/lib/api/searchTerms', () => ({
  fetchActiveSearchTerms: vi.fn().mockResolvedValue([]),
}));

// ── npm-Paket: der Hook braucht eine navigate-Funktion ───────────────────
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem('table-state:projects');
  window.history.replaceState(null, '', '/');
});

describe('useAdminProjects', () => {
  it('exposes the project columns and an empty table once loaded', async () => {
    const { result } = renderHook(() => useAdminProjects());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.columns).toHaveProperty('id');
    expect(result.current.columns).toHaveProperty('title');
    expect(result.current.table.data).toEqual([]);
  });
});
