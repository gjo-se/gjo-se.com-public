/**
 * AIScope admin chart endpoints (bar, radar, trend, delta, impact, monthly, swing).
 */
import { api } from '@src/lib/api/axios';

import { chartsBase } from './aiscopeEndpoints';

/** Bar chart point: skill by importance (market demand). */
export interface BarPoint {
  skill_id: number
  skill_name: string
  importance: number | null
}

/** Delta chart point: average score improvement per skill. */
export interface DeltaPoint {
  skill_id: number
  skill_name: string
  current_level: number | null
  project_count: number
  avg_score_before: number
  avg_score_after: number
  avg_delta: number
  total_delta: number
}

/** Impact chart point: learning impact of a skill. */
export interface ImpactPoint {
  skill_id: number
  skill_name: string
  project_count: number
  avg_importance: number | null
  curated_importance: number | null
  blended_importance: number
  level: number | null
  impact: number
  current_match: number
  simulated_match: number
  match_delta: number
}

/** Monthly project volume point (total vs matching). */
export interface MonthlyProjectPoint {
  month: string
  total: number
  matching: number
}

/** Radar chart point: Soll (importance) vs. Ist (level) per skill. */
export interface RadarPoint {
  skill_id: number
  skill_name: string
  importance: number | null
  level: number | null
}

/** Swing chart point: projects crossing the match threshold per skill. */
export interface SwingPoint {
  skill_id: number
  skill_name: string
  current_level: number | null
  current_avg_score: number
  total_projects: number
  swing_count: number
}

/** Trend chart point: relative skill frequency per time window. */
export interface TrendPoint {
  window_start: string
  skill_name: string
  relative_frequency: number
}

/** Allowed date_trunc buckets for the trend endpoint. */
export type TrendWindow = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** Fetches bar chart data (Top-N skills by importance), optionally by role. */
export async function fetchChartBar(params: { role_id?: number; top_n?: number }): Promise<BarPoint[]> {
  const response = await api.get<BarPoint[]>(`${chartsBase}/bar`, { params });
  return response.data;
}

/** Fetches delta analysis: average score improvement per skill. */
export async function fetchChartDelta(params: {
  weeks?: number
  target_level?: number
}): Promise<DeltaPoint[]> {
  const response = await api.get<DeltaPoint[]>(`${chartsBase}/delta`, { params });
  return response.data;
}

/** Fetches impact ranking: skills sorted by learning impact DESC. */
export async function fetchChartImpact(params?: { top_n?: number }): Promise<ImpactPoint[]> {
  const response = await api.get<ImpactPoint[]>(`${chartsBase}/impact`, { params });
  return response.data;
}

/** Fetches monthly project volume: total vs matching (>= threshold). */
export async function fetchChartMonthly(threshold = 75): Promise<MonthlyProjectPoint[]> {
  const response = await api.get<MonthlyProjectPoint[]>(`${chartsBase}/monthly`, { params: { threshold } });
  return response.data;
}

/** Fetches radar chart data (importance vs. level) for the Top-N skills, optionally by role. */
export async function fetchChartRadar(params: { role_id?: number; top_n?: number }): Promise<RadarPoint[]> {
  const response = await api.get<RadarPoint[]>(`${chartsBase}/radar`, { params });
  return response.data;
}

/** Fetches swing analysis: projects crossing the match threshold per skill. */
export async function fetchChartSwing(params: {
  weeks?: number
  threshold?: number
  target_level?: number
}): Promise<SwingPoint[]> {
  const response = await api.get<SwingPoint[]>(`${chartsBase}/swing`, { params });
  return response.data;
}

/** Fetches trend chart data (relative skill frequency per time window) for the given skills. */
export async function fetchChartTrend(params: {
  skill_ids: number[]
  role_id?: number
  window?: TrendWindow
}): Promise<TrendPoint[]> {
  const response = await api.get<TrendPoint[]>(`${chartsBase}/trend`, {
    params: { ...params, skill_ids: params.skill_ids.join(',') },
  });
  return response.data;
}
