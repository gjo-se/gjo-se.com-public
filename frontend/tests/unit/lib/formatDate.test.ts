/**
 * Tests: formatDate – German display formats, ISO week math and date presets.
 *
 * All values are hard-coded; preset ranges freeze the clock so the currently
 * computed range is deterministic.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  formatDate,
  formatDateOnly,
  formatDateTimeSeconds,
  formatRange,
  getISOWeek,
  resolveDates,
  weekKeyToDateRange,
} from '@src/lib/formatDate';

afterEach(() => {
  vi.useRealTimers();
});

describe('formatDate', () => {
  it('formatiert einen lokalen ISO-Zeitstempel deutsch mit Uhrzeit', () => {
    expect(formatDate('2026-05-01T10:30:00')).toBe('01.05.2026, 10:30');
  });

  it('liefert für fehlende Werte einen Gedankenstrich', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('kennzeichnet ein ungültiges Datum als Invalid Date', () => {
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });
});

describe('formatDateOnly', () => {
  it('formatiert ein lokales Datum als kurzes deutsches Datum', () => {
    expect(formatDateOnly('2026-05-01T10:30:00')).toBe('01.05.2026');
  });

  it('gibt den Rohwert zurück wenn das Datum ungültig ist', () => {
    expect(formatDateOnly('31.02.2026')).toBe('31.02.2026');
  });

  it('behandelt null und undefined als fehlenden Wert', () => {
    expect(formatDateOnly(null)).toBe('—');
    expect(formatDateOnly(undefined)).toBe('—');
  });
});

describe('formatDateTimeSeconds', () => {
  it('ergänzt die Sekunden im deutschen Zeitstempel', () => {
    expect(formatDateTimeSeconds('2026-05-01T10:30:45')).toBe('01.05.2026, 10:30:45');
  });

  it('gibt bei leerem Wert einen Gedankenstrich zurück', () => {
    expect(formatDateTimeSeconds(null)).toBe('—');
  });
});

describe('formatRange', () => {
  it('fordert zur Auswahl auf wenn beide Grenzen fehlen', () => {
    expect(formatRange()).toBe('Datum wählen…');
  });

  it('formatiert beide Grenzen als deutschen Bereich', () => {
    expect(formatRange('2026-05-01', '2026-05-31')).toBe('01.05.2026 – 31.05.2026');
  });

  it('formatiert eine einzelne Grenze ohne Gegenstück', () => {
    expect(formatRange('2026-05-01')).toBe('01.05.2026');
    expect(formatRange(undefined, '2026-05-31')).toBe('31.05.2026');
  });
});

describe('getISOWeek', () => {
  it('ordnet den 1. Januar 2026 der ersten Kalenderwoche zu', () => {
    expect(getISOWeek(new Date(2026, 0, 1, 12))).toEqual({ year: 2026, week: 1 });
  });

  it('ordnet einen Montag der erwarteten Woche zu', () => {
    expect(getISOWeek(new Date(2026, 3, 20, 12))).toEqual({ year: 2026, week: 17 });
  });

  it('zählt den Jahreswechsel zur ISO-Woche des Vorjahres', () => {
    expect(getISOWeek(new Date(2027, 0, 1, 12))).toEqual({ year: 2026, week: 53 });
  });
});

describe('weekKeyToDateRange', () => {
  it('übersetzt einen Wochen-Key in Montag und Sonntag', () => {
    expect(weekKeyToDateRange('2026-W17')).toEqual(['2026-04-20', '2026-04-26']);
  });

  it('übersetzt die erste Woche eines Jahres korrekt', () => {
    expect(weekKeyToDateRange('2026-W01')).toEqual(['2025-12-29', '2026-01-04']);
  });
});

describe('resolveDates', () => {
  it('liefert für die aktuelle Woche Montag bis Sonntag', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 6, 12));

    expect(resolveDates('this-week')).toEqual(['2026-05-04', '2026-05-10']);
  });

  it('liefert für die letzte Woche den vorherigen Montag bis Sonntag', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 6, 12));

    expect(resolveDates('last-week')).toEqual(['2026-04-27', '2026-05-03']);
  });

  it('liefert für den aktuellen und letzten Monat die Monatsgrenzen', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 6, 12));

    expect(resolveDates('this-month')).toEqual(['2026-05-01', '2026-05-31']);
    expect(resolveDates('last-month')).toEqual(['2026-04-01', '2026-04-30']);
  });

  it('nutzt bei custom die übergebenen Grenzen unverändert', () => {
    expect(resolveDates('custom', '2026-01-01', '2026-01-31')).toEqual(['2026-01-01', '2026-01-31']);
  });

  it('liefert ohne Preset keine Grenzen', () => {
    expect(resolveDates(null)).toEqual([undefined, undefined]);
  });
});
