/**
 * HTTP boundary fake for FBF unit tests.
 *
 * The axios instance (`@src/lib/api/axios`) is the system boundary; every real
 * service runs against this fake. Tests register per-endpoint handlers and
 * assert the recorded calls. No internal module is mocked.
 */

export type HttpMethod = 'get' | 'post' | 'put' | 'delete'

/** A single recorded request at the HTTP boundary. */
export interface HttpCall {
  method: HttpMethod
  url: string
  payload?: unknown
  params?: Record<string, unknown>
}

type Handler = (call: HttpCall) => unknown

interface Route {
  method: HttpMethod
  url: string
  handler: Handler
}

let routes: Route[] = []
const calls: HttpCall[] = []

/**
 * Executes a recorded request against the registered handler.
 *
 * @param call Recorded request.
 * @returns Axios-shaped response.
 * @throws Error when no handler is registered for the request.
 */
async function dispatch(call: HttpCall): Promise<{ data: unknown }> {
  calls.push(call);
  const route = [...routes]
    .reverse()
    .find((candidate) => candidate.method === call.method && candidate.url === call.url);
  if (!route) {
    throw new Error(`Unexpected request: ${call.method.toUpperCase()} ${call.url}`);
  }
  return { data: await route.handler(call) };
}

/** Recording fake for the project-wide axios instance. */
export const httpBoundary = {
  /** Requests recorded since the last reset. */
  calls,

  /** Clears recorded calls and registered handlers. */
  reset(): void {
    routes = [];
    calls.length = 0;
  },

  /**
   * Registers a handler for an exact method + URL pair.
   *
   * @param method HTTP method.
   * @param url Exact request URL.
   * @param handler Returns the response body; throw to reject.
   */
  on(method: HttpMethod, url: string, handler: Handler): void {
    routes.push({ method, url, handler });
  },

  api: {
    get(url: string, config?: { params?: Record<string, unknown> }): Promise<{ data: unknown }> {
      return dispatch({ method: 'get', url, params: config?.params });
    },
    post(url: string, payload?: unknown): Promise<{ data: unknown }> {
      return dispatch({ method: 'post', url, payload });
    },
    put(url: string, payload?: unknown): Promise<{ data: unknown }> {
      return dispatch({ method: 'put', url, payload });
    },
    delete(url: string): Promise<{ data: unknown }> {
      return dispatch({ method: 'delete', url });
    },
  },
}
