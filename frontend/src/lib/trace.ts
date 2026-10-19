/**
 * Frontend trace instrumentation for pipeline debugging.
 *
 * Writes structured trace events to both `console.debug` (DevTools)
 * and `sessionStorage` (survives page navigations).  Clear with
 * `feTrace.clear()` or by closing the browser tab.
 *
 * Usage:
 *   import { feTrace } from '@src/lib/trace';
 *   feTrace.time('reload');
 *   // ... work ...
 *   feTrace.timeEnd('reload', { count: 20 });
 *
 * After a test run, read the trace from the Console tab (filter "fe-trace")
 * or from the browser console:
 *   JSON.parse(sessionStorage.getItem('fe-trace') || '[]')
 */
const STORAGE_KEY = 'fe-trace';
const MAX_EVENTS = 500;

interface TraceEvent {
  step: string;
  ts: number;          // performance.now() relative to page load
  wall: string;        // ISO timestamp
  dur?: number;        // ms (only for timeEnd)
  ctx?: Record<string, unknown>;
}

const events: TraceEvent[] = [];
const timers = new Map<string, number>();
let pageLabel = 'unknown';

function emit(evt: TraceEvent): void {
  events.push(evt);
  if (events.length > MAX_EVENTS) events.shift();
  persist();
  const ctx = evt.ctx ? ' ' + Object.entries(evt.ctx).map(([k, v]) => `${k}=${v}`).join(' ') : '';
  const dur = evt.dur != null ? ` (${evt.dur}ms)` : '';
  console.debug(
    `%c⏱ fe-trace %c${evt.step}%c${dur}%c${ctx}`,
    'color:#888', 'color:#0af;font-weight:bold', 'color:#fa0', 'color:#aaa',
  );
}

function now(): number {
  return performance.now();
}

function persist(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch { /* quota exceeded – drop oldest */ }
}

export const feTrace = {
  /** Label the current page – call once on mount. */
  setPage(label: string): void {
    pageLabel = label;
  },

  /** Start a timer. */
  time(step: string): void {
    timers.set(step, now());
  },

  /** End a timer and emit the event. */
  timeEnd(step: string, ctx?: Record<string, unknown>): void {
    const start = timers.get(step);
    timers.delete(step);
    emit({
      step,
      ts: now(),
      wall: new Date().toISOString(),
      dur: start != null ? Math.round(now() - start) : undefined,
      ctx: { ...ctx, page: pageLabel },
    });
  },

  /** Emit an instant event (no duration). */
  mark(step: string, ctx?: Record<string, unknown>): void {
    emit({
      step,
      ts: now(),
      wall: new Date().toISOString(),
      ctx: { ...ctx, page: pageLabel },
    });
  },

  /** Emit an instant event with the wall-clock diff from page load. */
  markWall(step: string, ctx?: Record<string, unknown>): void {
    emit({
      step,
      ts: now(),
      wall: new Date().toISOString(),
      ctx,
    });
  },

  /** Return all events so far. */
  dump(): TraceEvent[] {
    return [...events];
  },

  /** Clear the trace buffer. */
  clear(): void {
    events.length = 0;
    timers.clear();
    sessionStorage.removeItem(STORAGE_KEY);
  },
};
