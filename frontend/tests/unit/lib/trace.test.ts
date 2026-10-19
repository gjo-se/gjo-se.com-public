/**
 * Tests: feTrace – in-memory trace buffer exposed via the public trace API.
 *
 * Asserts the emitted events (step, page context, duration) and the bounded
 * buffer, not the console formatting or internal maps.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { feTrace } from '@src/lib/trace';

beforeEach(() => {
  feTrace.clear();
  sessionStorage.clear();
});

describe('feTrace.mark', () => {
  it('erfasst ein sofortiges Event mit Schritt und Kontext', () => {
    feTrace.setPage('skills');

    feTrace.mark('open', { count: 3 });

    const [event] = feTrace.dump();
    expect(event).toMatchObject({ step: 'open', ctx: { count: 3, page: 'skills' } });
    expect(event.dur).toBeUndefined();
  });

  it('hängt weitere Events in Reihenfolge an', () => {
    feTrace.mark('first');
    feTrace.mark('second');

    expect(feTrace.dump().map((event) => event.step)).toEqual(['first', 'second']);
  });
});

describe('feTrace.timeEnd', () => {
  it('berechnet eine nicht-negative Dauer für einen gestarteten Timer', () => {
    feTrace.time('load');

    feTrace.timeEnd('load', { count: 1 });

    const [event] = feTrace.dump();
    expect(event.step).toBe('load');
    expect(typeof event.dur).toBe('number');
    expect(event.dur).toBeGreaterThanOrEqual(0);
    expect(event.ctx).toMatchObject({ count: 1 });
  });

  it('lässt die Dauer weg wenn kein Timer gestartet wurde', () => {
    feTrace.timeEnd('without-start');

    const [event] = feTrace.dump();
    expect(event.dur).toBeUndefined();
    expect(event.step).toBe('without-start');
  });
});

describe('feTrace.markWall', () => {
  it('erfasst ein Event ohne Seiten-Label', () => {
    feTrace.setPage('detail');

    feTrace.markWall('render', { size: 20 });

    const [event] = feTrace.dump();
    expect(event.ctx).toEqual({ size: 20 });
  });
});

describe('feTrace.dump', () => {
  it('liefert eine Kopie des Puffers', () => {
    feTrace.mark('one');

    const snapshot = feTrace.dump();
    snapshot.push({ step: 'injected', ts: 0, wall: '' });

    expect(feTrace.dump()).toHaveLength(1);
  });

  it('begrenzt den Puffer auf die letzten 500 Events', () => {
    for (let index = 0; index < 505; index += 1) {
      feTrace.mark(`step-${index}`);
    }

    const events = feTrace.dump();
    expect(events).toHaveLength(500);
    expect(events[0].step).toBe('step-5');
    expect(events.at(-1)?.step).toBe('step-504');
  });
});

describe('feTrace.clear', () => {
  it('leert den Puffer und den sessionStorage-Eintrag', () => {
    feTrace.mark('one');
    feTrace.time('pending');

    feTrace.clear();

    expect(feTrace.dump()).toEqual([]);
    expect(sessionStorage.getItem('fe-trace')).toBeNull();
  });
});
