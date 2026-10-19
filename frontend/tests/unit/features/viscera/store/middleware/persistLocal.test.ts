/**
 * Tests: persistLocal middleware
 *
 * Behaviour: hydration reads only valid UI preferences from `viscera_state`
 * (invalid ratios and empty URLs are ignored, corrupt JSON is tolerated) and
 * the write subscription persists UI/navigation/editor fields — never the
 * transient node overrides (Kanon R1).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  initPersistLocal,
  subscribePersistLocal,
} from '@src/features/viscera/store/middleware/persistLocal';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

const store = () => useVisceraStore.getState();

function writeStorage(value: unknown): void {
  localStorage.setItem('viscera_state', JSON.stringify(value));
}

function readStorage(): Record<string, unknown> | null {
  const raw = localStorage.getItem('viscera_state');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

beforeEach(() => {
  localStorage.clear();
  resetVisceraStore();
});

describe('initPersistLocal – hydration', () => {
  it('restores the panel collapse flag', () => {
    writeStorage({ ui: { panelCollapsed: true }, navigation: {} });

    initPersistLocal(useVisceraStore);

    expect(store().panelCollapsed).toBe(true);
  });

  it('restores valid editor split ratios only', () => {
    writeStorage({
      ui: {},
      navigation: {},
      editor: { splitRatioAdr: 0.3, splitRatioYaml: 0.95 },
    });

    initPersistLocal(useVisceraStore);

    expect(store().splitRatioAdr).toBe(0.3);
    expect(store().splitRatioYaml).toBe(0.5);
  });

  it('ignores a ratio below the lower bound', () => {
    writeStorage({ ui: {}, navigation: {}, editor: { splitRatioAdr: 0.1 } });

    initPersistLocal(useVisceraStore);

    expect(store().splitRatioAdr).toBe(0.5);
  });

  it('restores non-empty last URLs and skips empty ones', () => {
    writeStorage({
      ui: {},
      editor: {},
      navigation: { lastUrl: { SystemContext: '/x', broken: '' } },
    });

    initPersistLocal(useVisceraStore);

    expect(store().lastUrl).toEqual({ SystemContext: '/x' });
  });

  it('tolerates corrupt JSON without changing the store', () => {
    localStorage.setItem('viscera_state', '{broken');

    expect(() => initPersistLocal(useVisceraStore)).not.toThrow();
    expect(store().panelCollapsed).toBe(false);
  });

  it('does nothing when no persisted state exists', () => {
    initPersistLocal(useVisceraStore);

    expect(store().panelCollapsed).toBe(false);
    expect(store().lastUrl).toEqual({});
  });
});

describe('subscribePersistLocal – write-back', () => {
  it('persists UI, navigation and editor fields on change', () => {
    subscribePersistLocal(useVisceraStore);

    store().setPanelCollapsed(true);
    store().setSplitRatio('adr', 0.4);
    store().setLastUrl('SystemContext', '/x');

    expect(readStorage()).toMatchObject({
      ui: { panelCollapsed: true },
      editor: { splitRatioAdr: 0.4 },
      navigation: { lastUrl: { SystemContext: '/x' } },
    });
  });

  it('never persists transient node overrides', () => {
    subscribePersistLocal(useVisceraStore);

    store().setNodeOverride('view:api', { x: 1, y: 2 });

    const persisted = readStorage();
    expect(persisted).not.toHaveProperty('canvas');
    expect(JSON.stringify(persisted)).not.toContain('view:api');
  });

  it('ignores storage write failures', () => {
    subscribePersistLocal(useVisceraStore);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => store().setPanelCollapsed(true)).not.toThrow();
  });
});
