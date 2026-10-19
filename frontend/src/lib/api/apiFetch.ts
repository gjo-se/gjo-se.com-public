/**
 * apiFetch – zentraler JSON-HTTP-Helper für Feature-Services.
 *
 * Kapselt die wiederkehrende Boilerplate aller `features/* /services/*.ts`:
 * `credentials: 'include'`, JSON-Body-Handling, Query-String (`qs`) und die
 * Fehlerabbildung (Status + `detail` → `Error`). Services nutzen danach nur
 * noch `apiFetch` + die generierten OpenAPI-Typen.
 *
 * Lebt neben der bestehenden `frontend/src/lib/api/axios.ts`-Instanz.
 */

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Wird zentral JSON.stringify'd (Content-Type: application/json). */
  body?: unknown
  /** Query-Parameter; ersetzt das frühere lokale `qs(params)`. */
  query?: Record<string, unknown>
  signal?: AbortSignal
  /** Zusätzliche Header (nur ohne `body` bzw. zusätzlich zum JSON-Header). */
  headers?: Record<string, string>
  /** Rohen Body (z. B. FormData) unverändert senden – kein JSON-Header. */
  rawBody?: BodyInit
  /** Response-Parsing: 'json' (Default) oder 'blob' (z. B. PDF). */
  parse?: 'json' | 'blob'
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Typed convenience wrapper around `apiFetchRaw` that parses the response.
 *
 * Args:
 *   path: Path after the API base URL.
 *   options: Method, body, query/rawBody, signal, headers, parse.
 *
 * Returns:
 *   Parsed JSON (default), a Blob (`parse: 'blob'`), or `undefined` on 204.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const res = await apiFetchRaw(path, options);
  if (options.parse === 'blob') return (await res.blob()) as T;
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return (await res.json()) as T;
}

/**
 * Performs a fetch with `credentials: 'include'` and central error mapping.
 *
 * Args:
 *   path: Path after the API base URL, e.g. `/api/v1/admin/portfolio`.
 *   options: Method, body, query/rawBody, signal, headers.
 *
 * Returns:
 *   The ok Response (caller parses it). Non-ok responses throw.
 */
export async function apiFetchRaw(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { method = 'GET', body, query, signal, headers, rawBody } = options;
  const url = `${API_BASE}${path}${query ? qs(query) : ''}`;

  const init: RequestInit = { credentials: 'include', method, signal };
  if (rawBody !== undefined) {
    init.body = rawBody;
  } else if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json', ...(headers ?? {}) };
    init.body = JSON.stringify(body);
  } else if (headers) {
    init.headers = headers;
  }

  const res = await fetch(url, init);
  if (!res.ok) await throwResponseError(res);
  return res;
}

/**
 * Builds a query string from a params object, ignoring undefined/null/empty.
 *
 * Args:
 *   params: Query parameters; falsy-empty values are dropped.
 *
 * Returns:
 *   `?k=v&...` or an empty string when no value survives.
 */
export function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/**
 * Throws an Error with the response status and detail message on non-ok.
 *
 * Shared error mapping for hand-rolled `fetch` calls that do not go through
 * `apiFetchRaw` (e.g. admin services with a custom URL).
 *
 * Args:
 *   res: The non-ok fetch Response.
 *
 * Raises:
 *   Error: Always, with `<status>: <detail|statusText>`.
 */
export async function throwResponseError(res: Response): Promise<never> {
  const text = await res.text().catch(() => '');
  let detail = text;
  try {
    const json = JSON.parse(text) as { detail?: string };
    detail = json.detail ?? text;
  } catch {
    // Kein JSON – rohen Text verwenden.
  }
  throw new Error(`${res.status}: ${detail || res.statusText}`);
}
