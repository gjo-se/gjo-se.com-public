/**
 * Frontend Real User Monitoring (RUM) – SOTA Performance Observability.
 *
 * Collects Core Web Vitals, Long Tasks, Navigation Timing, and custom
 * User-Timing marks/measures via the browser-native Performance API.
 *
 * Data is batched and sent to ``POST /api/v1/log/frontend-metric`` via
 * ``navigator.sendBeacon()`` (fire-and-forget, never blocks the UI).
 *
 * Active only in dev mode (``import.meta.env.DEV``) for now.
 * Production activation pending OTel Browser SDK migration (#1399).
 *
 * Usage (in main.tsx or entry point):
 *   import '@src/providers/rum/performance';  // side-effect: auto-starts observers
 */

import { startSteadyStateFlush } from './steadyStateFlush';

// ── Backend endpoint ──────────────────────────────────────────────────
const METRICS_ENDPOINT = `${import.meta.env.VITE_API_BASE_URL}/api/v1/log/frontend-metric`;

// ── Batching ──────────────────────────────────────────────────────────
/** Non-standard Long Task attribution entry (Chromium only). */
interface LongTaskAttribution {
  name?: string;
  containerType?: string;
  containerSrc?: string;
}

export interface MetricEvent {
  type: string;       // 'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb' | 'longtask' | 'navigation' | 'mark' | 'error'
  name?: string;      // metric name or mark name
  value: number;      // ms for timing, score for CLS (0 for error events)
  page: string;       // window.location.pathname
  ts: string;         // ISO timestamp
  ctx?: Record<string, unknown>;
}

const batch: MetricEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
  if (batch.length === 0) return;
  const events = batch.splice(0);
  const payload = JSON.stringify({ events });

  // Use fetch with explicit JSON content type – sendBeacon sends
  // text/plain which FastAPI rejects as 422.
  fetch(METRICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => { /* must not throw */ });
}

// ── Long Tasks ────────────────────────────────────────────────────────
function observeLongTasks(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const attribution = (entry as PerformanceEntry & { attribution?: LongTaskAttribution[] }).attribution?.[0];
        sendMetric({
          type: 'longtask',
          name: attribution?.name || 'unknown',
          value: entry.duration,
          page: window.location.pathname,
          ts: new Date().toISOString(),
          ctx: {
            startTime: entry.startTime,
            containerType: attribution?.containerType,
            containerSrc: attribution?.containerSrc?.substring(0, 200),
          },
        });
      });
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    // longtask not supported (e.g., Firefox)
  }
}

// ── Navigation Timing ─────────────────────────────────────────────────
function observeNavigation(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const nav = entry as PerformanceNavigationTiming;
        sendMetric({
          type: 'navigation',
          name: nav.type, // 'navigate' | 'reload' | 'back_forward'
          value: nav.loadEventEnd - nav.fetchStart, // total load time
          page: window.location.pathname,
          ts: new Date().toISOString(),
          ctx: {
            ttfb: nav.responseStart - nav.requestStart,
            domLoad: nav.domContentLoadedEventEnd - nav.fetchStart,
            dns: nav.domainLookupEnd - nav.domainLookupStart,
            tls: nav.connectEnd - nav.secureConnectionStart,
            redirect: nav.redirectEnd - nav.redirectStart,
          },
        });
      });
    });
    observer.observe({ type: 'navigation', buffered: true });
  } catch {
    // navigation timing not supported
  }
}

// ── Web Vitals ────────────────────────────────────────────────────────
function observeWebVitals(): void {
  // Dynamic import – web-vitals may not be installed yet
  import('web-vitals').then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
    const page = window.location.pathname;

    onLCP((metric) => sendMetric({ type: 'lcp', name: metric.name, value: metric.value, page, ts: new Date().toISOString() }));
    onINP((metric) => sendMetric({ type: 'inp', name: metric.name, value: metric.value, page, ts: new Date().toISOString() }));
    onCLS((metric) => sendMetric({ type: 'cls', name: metric.name, value: metric.value, page, ts: new Date().toISOString() }));
    onFCP((metric) => sendMetric({ type: 'fcp', name: metric.name, value: metric.value, page, ts: new Date().toISOString() }));
    onTTFB((metric) => sendMetric({ type: 'ttfb', name: metric.name, value: metric.value, page, ts: new Date().toISOString() }));
  }).catch(() => {
    // web-vitals not installed – skip silently
  });
}

/**
 *
 */
export function sendMetric(event: MetricEvent): void {
  batch.push(event);
  if (!flushTimer) {
    flushTimer = setTimeout(flush, 5000);
  }
  // Also flush if batch reaches 20 events
  if (batch.length >= 20) {
    clearTimeout(flushTimer);
    flushTimer = null;
    flush();
  }
}

// ── Page unload – flush remaining ─────────────────────────────────────
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flush();
  }
});

// ── Activate ──────────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  observeLongTasks();
  observeNavigation();
  observeWebVitals();
  startSteadyStateFlush(flush);
}
