/**
 * Axios interceptor that captures every HTTP request/response and
 * sends the trace to the backend ``/dev/fe-trace`` endpoint.
 *
 * Active only in dev mode (``import.meta.env.DEV``).  Uses native
 * ``fetch()`` for the trace POST to avoid infinite recursion through
 * the Axios instance itself.
 *
 * Traces are batched and flushed every 2 seconds or when the batch
 * reaches 50 events, whichever comes first.
 */
import api from './axios';

import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';


const TRACE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/dev/fe-trace`;

interface HttpTraceEvent {
  step: string;       // 'request' | 'response'
  ts: string;         // ISO timestamp
  method: string;
  url: string;
  status?: number;
  duration_ms?: number;
  size?: number;
}

/** Axios request config carrying the tracing start time attached by the request interceptor. */
type TracedConfig = InternalAxiosRequestConfig & { traceStart?: number };

const batch: HttpTraceEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
  if (batch.length === 0) return;
  const events = batch.splice(0);
  // Fire-and-forget – don't block the app if backend is slow
  fetch(TRACE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => { /* ignore – tracing must not break the app */ });
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 2000);
}

// ── Interceptors (nur Dev – der Trace-Endpunkt existiert in Prod nicht) ──
if (import.meta.env.DEV) {
  // ── Request interceptor ──────────────────────────────────────────
  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Don't trace the trace endpoint itself
    if (config.url?.includes('/dev/fe-trace')) return config;

    batch.push({
      step: 'request',
      ts: new Date().toISOString(),
      method: config.method?.toUpperCase() ?? '?',
      url: config.url ?? '',
    });
    // Store start time on config for duration calculation
    (config as TracedConfig).traceStart = performance.now();
    scheduleFlush();
    return config;
  });

  // ── Response interceptor ─────────────────────────────────────────
  api.interceptors.response.use(
    (response: AxiosResponse) => {
      if (response.config.url?.includes('/dev/fe-trace')) return response;

      const start: number | undefined = (response.config as TracedConfig).traceStart;
      const durationMs = start != null ? Math.round(performance.now() - start) : undefined;
      const size = JSON.stringify(response.data).length;

      batch.push({
        step: 'response',
        ts: new Date().toISOString(),
        method: response.config.method?.toUpperCase() ?? '?',
        url: response.config.url ?? '',
        status: response.status,
        duration_ms: durationMs,
        size,
      });
      scheduleFlush();
      return response;
    },
    (error: AxiosError) => {
      const config = error.config;
      if (config?.url?.includes('/dev/fe-trace')) return Promise.reject(error);

      const start: number | undefined = (config as TracedConfig | undefined)?.traceStart;
      const durationMs = start != null ? Math.round(performance.now() - start) : undefined;

      batch.push({
        step: 'response',
        ts: new Date().toISOString(),
        method: config?.method?.toUpperCase() ?? '?',
        url: config?.url ?? '',
        status: error.response?.status ?? 0,
        duration_ms: durationMs,
      });
      scheduleFlush();
      return Promise.reject(error);
    },
  );
}
