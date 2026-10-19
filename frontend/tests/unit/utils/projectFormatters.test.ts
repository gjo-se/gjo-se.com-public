/**
 * Tests: projectFormatters – display labels and project risk flags.
 *
 * Covers all enum branches, missing values and the age boundary at 30 days.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  formatContractType,
  formatDuration,
  formatStartDate,
  isLowRemote,
  isOlderThan30Days,
  isRedContractType,
} from '@src/utils/projectFormatters';

afterEach(() => {
  vi.useRealTimers();
});

describe('formatContractType', () => {
  it('übersetzt alle bekannten Vertragsarten', () => {
    expect(formatContractType('contracting')).toBe('Freelancer');
    expect(formatContractType('employee_leasing')).toBe('Arbeitnehmerüberlassung');
    expect(formatContractType('permanent_position')).toBe('Festanstellung');
  });

  it('gibt unbekannte Werte unverändert zurück', () => {
    expect(formatContractType('unknown_type')).toBe('unknown_type');
  });

  it('liefert für fehlende Werte einen Gedankenstrich', () => {
    expect(formatContractType(null)).toBe('–');
    expect(formatContractType(undefined)).toBe('–');
    expect(formatContractType('')).toBe('–');
  });
});

describe('formatDuration', () => {
  it('hängt die Monats-Einheit an den Rohwert', () => {
    expect(formatDuration('6')).toBe('6 Mon.');
    expect(formatDuration('5/2026')).toBe('5/2026 Mon.');
  });

  it('liefert für fehlende Werte einen Gedankenstrich', () => {
    expect(formatDuration(null)).toBe('–');
  });
});

describe('formatStartDate', () => {
  it('normalisiert einstellige Monate auf zwei Stellen', () => {
    expect(formatStartDate('5/2026')).toBe('05/2026');
  });

  it('behält bereits zweistellige Monate bei', () => {
    expect(formatStartDate('12/2026')).toBe('12/2026');
  });

  it('behandelt Monat 0 und 00 als fehlendes Datum', () => {
    expect(formatStartDate('0/2026')).toBe('–');
    expect(formatStartDate('00/2026')).toBe('–');
  });

  it('gibt Werte ohne Monatsformat unverändert zurück', () => {
    expect(formatStartDate('2026')).toBe('2026');
  });

  it('liefert für fehlende Werte einen Gedankenstrich', () => {
    expect(formatStartDate(null)).toBe('–');
    expect(formatStartDate('')).toBe('–');
  });
});

describe('isLowRemote', () => {
  it('markiert Remote-Anteile unter 80 Prozent', () => {
    expect(isLowRemote(0)).toBe(true);
    expect(isLowRemote(79)).toBe(true);
  });

  it('markiert ab 80 Prozent nicht mehr', () => {
    expect(isLowRemote(80)).toBe(false);
    expect(isLowRemote(100)).toBe(false);
  });

  it('behandelt fehlende Werte als nicht niedrig', () => {
    expect(isLowRemote(null)).toBe(false);
    expect(isLowRemote(undefined)).toBe(false);
  });
});

describe('isOlderThan30Days', () => {
  it('markiert Daten älter als 30 Tage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));

    expect(isOlderThan30Days('2026-05-15T12:00:00Z')).toBe(true);
  });

  it('markiert genau 30 Tage alte Daten nicht', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));

    expect(isOlderThan30Days('2026-05-16T12:00:00Z')).toBe(false);
  });

  it('behandelt fehlende Werte als nicht alt', () => {
    expect(isOlderThan30Days(null)).toBe(false);
    expect(isOlderThan30Days(undefined)).toBe(false);
  });
});

describe('isRedContractType', () => {
  it('markiert Anstellung und Arbeitnehmerüberlassung', () => {
    expect(isRedContractType('employee_leasing')).toBe(true);
    expect(isRedContractType('permanent_position')).toBe(true);
  });

  it('markiert Freelance-Verträge nicht', () => {
    expect(isRedContractType('contracting')).toBe(false);
    expect(isRedContractType(null)).toBe(false);
  });
});
