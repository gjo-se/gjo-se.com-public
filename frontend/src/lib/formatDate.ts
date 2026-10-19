/**
 * Date & time helpers – pure functions, no project imports (lib leaf node).
 */

// ── Display ────────────────────────────────────────────────────────────

/** Formats an ISO date string to the German locale (dd.MM.yyyy, HH:mm). */
export type DatePreset = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'custom' | null;

// ── ISO helpers ────────────────────────────────────────────────────────

/** Parses a YYYY-MM-DD string into a Date object. */
export interface StoredDateFilter {
  preset: DatePreset
  from?: string
  to?: string
}

// ── ISO Week helpers ────────────────────────────────────────────────

/** Represents a predefined or custom date range filter selection. */
export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formats an ISO date to a German short date (dd.MM.yyyy); missing → em dash, invalid → raw value. */
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** German timestamp incl. seconds (dd.MM.yyyy, HH:mm:ss); missing → em dash, invalid → raw value. */
export function formatDateTimeSeconds(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Formats an optional ISO date range (from/to) to a German display string. */
export function formatRange(from?: string, to?: string): string {
  if (!from && !to) return 'Datum wählen…';

  function fmtDisplay(d?: string): string {
    if (!d) return '?';
    const [y, m, day] = d.split('-');
    return `${day}.${m}.${y}`;
  }

  if (from && to) return `${fmtDisplay(from)} – ${fmtDisplay(to)}`;
  return fmtDisplay(from ?? to);
}

// ── Date preset types ──────────────────────────────────────────────

/** Returns the ISO week number and year for a given Date. */
export function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: d.getFullYear(), week };
}

/** Returns [first day, last day] of the current (offset=0) or previous (offset=-1) month as YYYY-MM-DD. */
function getMonthRange(offset: 0 | -1): [string, string] {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const last = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  return [toISODate(first), toISODate(last)];
}

/** Returns [monday, sunday] of the current or previous ISO week as YYYY-MM-DD strings. */
function getWeekRange(offset: 0 | -1): [string, string] {
  const today = new Date();
  const dow = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow + 1 + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [toISODate(monday), toISODate(sunday)];
}

// ── Calendar math ──────────────────────────────────────────────────────

/** Writes from/to date parameters to the current URL query string without triggering navigation. */
export function resolveDates(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
): [string | undefined, string | undefined] {
  if (preset === 'this-week') return getWeekRange(0);
  if (preset === 'last-week') return getWeekRange(-1);
  if (preset === 'this-month') return getMonthRange(0);
  if (preset === 'last-month') return getMonthRange(-1);
  if (preset === 'custom') return [customFrom, customTo];
  return [undefined, undefined];
}

/** Returns the [first, last] day of the current or previous month as YYYY-MM-DD strings. */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Display formatting ──────────────────────────────────────────────────

/** Converts an ISO week key (e.g. "2026-W17") to [YYYY-MM-DD Monday, YYYY-MM-DD Sunday]. */
export function weekKeyToDateRange(weekKey: string): [string, string] {
  const [yearStr, weekPart] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart, 10);

  const jan4 = new Date(year, 0, 4);
  const jan4DayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - jan4DayOfWeek + 1 + (week - 1) * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return [toISODate(monday), toISODate(sunday)];
}
