"""Prometheus metrics definitions for HTTP observability.

Defines module-level singleton metrics for request duration, total
requests, error counts, and DB pool utilisation.  Used by
``ObservabilityMiddleware`` and ``PoolGuard``, exposed via the
``/metrics`` endpoint.
"""

from prometheus_client import Counter, Gauge, Histogram

HTTP_REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    labelnames=("method", "path", "status_code"),
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 5.0),
)

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    labelnames=("method", "path", "status_code"),
)

HTTP_ERRORS_TOTAL = Counter(
    "http_errors_total",
    "Total number of HTTP errors (status >= 400)",
    labelnames=("method", "path", "status_code"),
)

# ── DB Pool Metrics ──────────────────────────────────────────────────

DB_POOL_ACTIVE = Gauge(
    "db_pool_active",
    "Number of currently checked-out DB connections",
)

DB_POOL_BLOCKED_CONSUMERS = Gauge(
    "db_pool_blocked_consumers",
    "Number of currently blocked consumer labels",
)
