/**
 * Tests: useSkillAnalysis – Ladepfad, Filter und Trend-Pivot am Hook-Interface.
 *
 * Gefakt ist nur der I/O-Rand (`@src/lib/api/aiscope`).
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSkillAnalysis } from '@src/features/aiscope/hooks/useSkillAnalysis';

const api = vi.hoisted(() => ({
  impact: vi.fn(),
  swing: vi.fn(),
  monthly: vi.fn(),
  trend: vi.fn(),
}));

vi.mock('@src/lib/api/aiscope', () => ({
  fetchChartImpact: api.impact,
  fetchChartSwing: api.swing,
  fetchChartMonthly: api.monthly,
  fetchChartTrend: api.trend,
}));

const impactPoint = (skillId: number, skillName: string, level: number, importance: number) => ({
  skill_id: skillId,
  skill_name: skillName,
  project_count: 3,
  avg_importance: importance,
  curated_importance: null,
  blended_importance: importance,
  level,
  impact: 1,
  current_match: 50,
  simulated_match: 60,
  match_delta: 10,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useSkillAnalysis', () => {
  it('loads impact, swing and monthly data', async () => {
    api.impact.mockResolvedValue([impactPoint(1, 'React', 5, 5)]);
    api.swing.mockResolvedValue([]);
    api.monthly.mockResolvedValue([{ month: '2026-01', total: 4, matching: 2 }]);
    api.trend.mockResolvedValue([]);

    const { result } = renderHook(() => useSkillAnalysis());

    await waitFor(() => expect(result.current.state.loading).toBe(false));

    expect(result.current.state.impact).toHaveLength(1);
    expect(result.current.state.monthly).toEqual([{ month: '2026-01', total: 4, matching: 2 }]);
    expect(result.current.state.analysisLoading).toBe(false);
  });

  it('keeps only trends for skills above the level and importance filters', async () => {
    api.impact.mockResolvedValue([
      impactPoint(1, 'React', 5, 5),
      impactPoint(2, 'Vue', 1, 1),
    ]);
    api.swing.mockResolvedValue([]);
    api.monthly.mockResolvedValue([]);
    api.trend.mockResolvedValue([
      { window_start: '2026-01-01T00:00:00Z', skill_name: 'React', relative_frequency: 0.5 },
      { window_start: '2026-01-01T00:00:00Z', skill_name: 'Vue', relative_frequency: 0.2 },
    ]);

    const { result } = renderHook(() => useSkillAnalysis());

    await waitFor(() => expect(result.current.state.trendRows).toHaveLength(1));

    expect(result.current.state.trendSkills).toEqual(['React']);
    expect(result.current.state.trendRows[0]).toMatchObject({ window: '2026-01-01', React: 0.5 });
    expect(api.trend).toHaveBeenCalledWith({ skill_ids: [1], window: 'month' });
  });

  it('clears the trend when no skill passes the filters', async () => {
    api.impact.mockResolvedValue([impactPoint(2, 'Vue', 1, 1)]);
    api.swing.mockResolvedValue([]);
    api.monthly.mockResolvedValue([]);

    const { result } = renderHook(() => useSkillAnalysis());

    await waitFor(() => expect(result.current.state.impact).toHaveLength(1));

    expect(result.current.state.trendRows).toEqual([]);
    expect(api.trend).not.toHaveBeenCalled();
  });

  it('persists the filter settings in localStorage', async () => {
    api.impact.mockResolvedValue([]);
    api.swing.mockResolvedValue([]);
    api.monthly.mockResolvedValue([]);

    const { result } = renderHook(() => useSkillAnalysis());

    result.current.actions.setMinLevel(2);
    result.current.actions.setMinImportance(4);

    await waitFor(() =>
      expect(localStorage.getItem('skillAnalysis_v1')).toContain('"minLevel":2'),
    );
    expect(localStorage.getItem('skillAnalysis_v1')).toContain('"minImportance":4');
  });

  it('restores the filter settings from localStorage', async () => {
    localStorage.setItem('skillAnalysis_v1', JSON.stringify({ minLevel: 1, minImportance: 2 }));
    api.impact.mockResolvedValue([]);
    api.swing.mockResolvedValue([]);
    api.monthly.mockResolvedValue([]);

    const { result } = renderHook(() => useSkillAnalysis());

    expect(result.current.state.minLevel).toBe(1);
    expect(result.current.state.minImportance).toBe(2);
  });

  it('reports a load error when the analysis data cannot be fetched', async () => {
    api.impact.mockRejectedValue(new Error('offline'));
    api.swing.mockResolvedValue([]);
    api.monthly.mockResolvedValue([]);

    const { result } = renderHook(() => useSkillAnalysis());

    await waitFor(() =>
      expect(result.current.state.error).toBe('Fehler beim Laden der Analyse-Daten.'),
    );
  });
});
