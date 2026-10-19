/**
 * Hook: useSkillAnalysis
 *
 * Data-fetching + filter logic for the skill analysis page.
 * Always aggregates by month (weeks=4). No role filter.
 */
import { useCallback, useEffect, useState } from 'react';

import { useMountOnce } from '@src/hooks/useMountOnce';
import {
  type ImpactPoint,
  type MonthlyProjectPoint,
  type SwingPoint,
  type TrendPoint,
  type TrendWindow,
  fetchChartImpact,
  fetchChartMonthly,
  fetchChartSwing,
  fetchChartTrend,
} from '@src/lib/api/aiscope';

// ── Types ───────────────────────────────────────────────────────

export interface SkillAnalysisActions {
  setMinLevel: (level: number) => void
  setMinImportance: (imp: number) => void
}

export interface SkillAnalysisState {
  loading: boolean
  error: string | null
  impact: ImpactPoint[]
  swing: SwingPoint[]
  monthly: MonthlyProjectPoint[]
  analysisLoading: boolean
  trendRows: TrendRow[]
  trendSkills: string[]
  trendLoading: boolean
  minLevel: number
  minImportance: number
}

export interface TrendRow {
  window: string
  [skillName: string]: string | number
}

export interface UseSkillAnalysisResult {
  state: SkillAnalysisState
  actions: SkillAnalysisActions
}

// ── Constants ───────────────────────────────────────────────────

const WEEKS = 4;
const TREND_WINDOW: TrendWindow = 'month';
const DEFAULT_MIN_LEVEL = 5;
const DEFAULT_MIN_IMPORTANCE = 3;

const LS_KEY = 'skillAnalysis_v1';

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, unknown>;
  } catch { /* ignore */ }
  return {};
}

function pivotTrend(points: TrendPoint[]): { rows: TrendRow[]; skills: string[] } {
  const skills = [...new Set(points.map((p) => p.skill_name))];
  const byWindow = new Map<string, TrendRow>();
  points.forEach((point) => {
    const windowKey = point.window_start.slice(0, 10);
    let row = byWindow.get(windowKey);
    if (!row) {
      row = { window: windowKey };
      byWindow.set(windowKey, row);
    }
    row[point.skill_name] = Number(point.relative_frequency.toFixed(3));
  });
  const rows = [...byWindow.values()].sort((a, b) => a.window.localeCompare(b.window));
  return { rows, skills };
}

// ── Helpers ─────────────────────────────────────────────────────

function saveSettings(patch: Record<string, unknown>) {
  try {
    const current = loadSettings();
    localStorage.setItem(LS_KEY, JSON.stringify({ ...current, ...patch }));
  } catch { /* ignore */ }
}

// ── Hook ────────────────────────────────────────────────────────

/**
 *
 */
export function useSkillAnalysis(): UseSkillAnalysisResult {
  const saved = loadSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [impact, setImpact] = useState<ImpactPoint[]>([]);
  const [swing, setSwing] = useState<SwingPoint[]>([]);
  const [monthly, setMonthly] = useState<MonthlyProjectPoint[]>([]);
  // Always aggregated by month (no async toggle): constant, never set.
  const analysisLoading = false;

  const [trendRows, setTrendRows] = useState<TrendRow[]>([]);
  const [trendSkills, setTrendSkills] = useState<string[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const [minLevel, setMinLevel] = useState((saved.minLevel as number) ?? DEFAULT_MIN_LEVEL);
  const [minImportance, setMinImportance] = useState((saved.minImportance as number) ?? DEFAULT_MIN_IMPORTANCE);

  useEffect(() => { saveSettings({ minLevel }); }, [minLevel]);
  useEffect(() => { saveSettings({ minImportance }); }, [minImportance]);

  // ── Load impact / swing / delta ──
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [impactData, swingData, monthlyData] = await Promise.all([
        fetchChartImpact(),
        fetchChartSwing({ weeks: WEEKS }),
        fetchChartMonthly(),
      ]);
      setImpact(impactData);
      setSwing(swingData);
      setMonthly(monthlyData);
    } catch {
      setError('Fehler beim Laden der Analyse-Daten.');
    } finally {
      setLoading(false);
    }
  }, []);

  useMountOnce(load);

  // ── Trend: reactive to filter sliders (fetches all, filters client-side) ──
  useEffect(() => {
    if (impact.length === 0) return;
    const filtered = impact.filter((p) => {
      if ((p.level ?? 0) < minLevel) return false;
      if (p.blended_importance < minImportance) return false;
      return true;
    });
    if (filtered.length === 0) {
      setTrendRows([]);
      setTrendSkills([]);
      return;
    }
    const allowedNames = new Set(filtered.map((p) => p.skill_name));
    let cancelled = false;
    setTrendLoading(true);
    fetchChartTrend({ skill_ids: filtered.map((p) => p.skill_id), window: TREND_WINDOW })
      .then((trendData) => {
        if (cancelled) return;
        const filteredTrend = trendData.filter((p) => allowedNames.has(p.skill_name));
        const { rows, skills } = pivotTrend(filteredTrend);
        setTrendRows(rows);
        setTrendSkills(skills);
      })
      .catch(() => { /* trend fails silently */ })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
      });
    return () => { cancelled = true; };
  }, [impact, minLevel, minImportance]);

  return {
    state: {
      loading, error, impact, swing, monthly, analysisLoading,
      trendRows, trendSkills, trendLoading,
      minLevel, minImportance,
    },
    actions: { setMinLevel, setMinImportance },
  };
}
