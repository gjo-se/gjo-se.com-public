/**
 * Tests: migration middleware
 *
 * Behaviour: legacy localStorage keys are converted once into the unified
 * `viscera_state` document, invalid values are skipped (errors), old keys are
 * removed, and the migration is idempotent (including the editor-scope
 * follow-up migration).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { migrateLegacyStorage } from '@src/features/viscera/store/middleware/migration';

function readNewState(): Record<string, unknown> | null {
  const raw = localStorage.getItem('viscera_state');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

describe('migrateLegacyStorage – empty storage', () => {
  it('reports zero counters when no legacy keys exist', () => {
    expect(migrateLegacyStorage()).toEqual({ migrated: 0, skipped: 0, errors: 0 });
  });

  it('writes nothing when there is nothing to migrate', () => {
    migrateLegacyStorage();

    expect(localStorage.getItem('viscera_state')).toBeNull();
  });
});

describe('migrateLegacyStorage – layout overrides', () => {
  it('migrates valid overrides and removes the legacy key', () => {
    localStorage.setItem(
      'viscera:layout:SystemContext',
      JSON.stringify({ api: { x: 10, y: 20 } }),
    );

    const result = migrateLegacyStorage();

    expect(result.migrated).toBe(1);
    expect(result.errors).toBe(0);
    expect(readNewState()).toMatchObject({
      canvas: { overrides: { api: { x: 10, y: 20 } } },
    });
    expect(localStorage.getItem('viscera:layout:SystemContext')).toBeNull();
  });

  it('drops entries without finite x/y but keeps the valid ones', () => {
    localStorage.setItem(
      'viscera:layout:view',
      JSON.stringify({ ok: { x: 1, y: 2 }, broken: { x: 'nope' }, empty: null }),
    );

    migrateLegacyStorage();

    expect(readNewState()).toMatchObject({ canvas: { overrides: { ok: { x: 1, y: 2 } } } });
  });

  it('counts corrupt JSON as an error when another key is still migrated', () => {
    localStorage.setItem('viscera:layout:broken', '{not json');
    localStorage.setItem('viscera:layout:view', JSON.stringify({ api: { x: 1, y: 2 } }));

    const result = migrateLegacyStorage();

    expect(result).toMatchObject({ migrated: 1, errors: 1 });
    expect(localStorage.getItem('viscera:layout:broken')).toBeNull();
  });

  it('writes nothing and keeps the legacy key when only corrupt JSON exists', () => {
    localStorage.setItem('viscera:layout:broken', '{not json');

    const result = migrateLegacyStorage();

    expect(result).toEqual({ migrated: 0, skipped: 0, errors: 0 });
    expect(localStorage.getItem('viscera_state')).toBeNull();
  });
});

describe('migrateLegacyStorage – last URL and panel state', () => {
  it('migrates last-url bookmarks per view key', () => {
    localStorage.setItem('viscera_last_url:SystemContext', '/admin/viscera/views?zoom=2');

    migrateLegacyStorage();

    expect(readNewState()).toMatchObject({
      navigation: { lastUrl: { SystemContext: '/admin/viscera/views?zoom=2' } },
    });
  });

  it('maps the collapsed flag only for the string "true"', () => {
    localStorage.setItem('viscera_perspective_bar_collapsed', 'true');

    migrateLegacyStorage();

    expect(readNewState()).toMatchObject({ ui: { panelCollapsed: true } });
  });

  it('treats any other collapsed value as false', () => {
    localStorage.setItem('viscera_perspective_bar_collapsed', '1');

    migrateLegacyStorage();

    expect(readNewState()).toMatchObject({ ui: { panelCollapsed: false } });
  });
});

describe('migrateLegacyStorage – editor split ratios', () => {
  it('converts percent values to ratios', () => {
    localStorage.setItem('viscera:adr-editor:splitRatio', '30');
    localStorage.setItem('architecture-viewer:editor:splitRatio', '70');

    migrateLegacyStorage();

    expect(readNewState()).toMatchObject({
      editor: { splitRatioAdr: 0.3, splitRatioYaml: 0.7 },
    });
  });

  it('clamps ratios below and above the valid range', () => {
    localStorage.setItem('viscera:adr-editor:splitRatio', '5');
    localStorage.setItem('architecture-viewer:editor:splitRatio', '95');

    migrateLegacyStorage();

    expect(readNewState()).toMatchObject({
      editor: { splitRatioAdr: 0.2, splitRatioYaml: 0.8 },
    });
  });

  it('drops a non-numeric ratio without writing it', () => {
    localStorage.setItem('viscera:adr-editor:splitRatio', 'wide');
    localStorage.setItem('viscera_perspective_bar_collapsed', 'true');

    const result = migrateLegacyStorage();

    // The invalid editor key still counts as processed (legacy key removed),
    // but no split ratio is written.
    expect(result).toMatchObject({ migrated: 2, errors: 0 });
    expect(readNewState()).not.toMatchObject({ editor: { splitRatioAdr: expect.anything() } });
  });
});

describe('migrateLegacyStorage – idempotency', () => {
  it('skips a second run once viscera_state exists with the editor scope', () => {
    localStorage.setItem(
      'viscera_state',
      JSON.stringify({
        canvas: { overrides: {} },
        editor: { splitRatioAdr: 0.5, splitRatioYaml: 0.5 },
        ui: {},
        navigation: {},
      }),
    );
    localStorage.setItem('viscera:layout:view', JSON.stringify({ api: { x: 1, y: 1 } }));

    const result = migrateLegacyStorage();

    expect(result).toEqual({ migrated: 0, skipped: 1, errors: 0 });
    expect(localStorage.getItem('viscera:layout:view')).not.toBeNull();
  });

  it('migrates editor keys when viscera_state exists without an editor scope', () => {
    localStorage.setItem(
      'viscera_state',
      JSON.stringify({ canvas: { overrides: {} }, ui: {}, navigation: {} }),
    );
    localStorage.setItem('viscera:adr-editor:splitRatio', '40');

    const result = migrateLegacyStorage();

    expect(result.migrated).toBe(1);
    expect(readNewState()).toMatchObject({ editor: { splitRatioAdr: 0.4 } });
    expect(localStorage.getItem('viscera:adr-editor:splitRatio')).toBeNull();
  });

  it('skips the editor follow-up when both ratios are already present', () => {
    localStorage.setItem(
      'viscera_state',
      JSON.stringify({
        canvas: { overrides: {} },
        editor: { splitRatioAdr: 0.5, splitRatioYaml: 0.5 },
        ui: {},
        navigation: {},
      }),
    );

    expect(migrateLegacyStorage()).toEqual({ migrated: 0, skipped: 1, errors: 0 });
  });
});
