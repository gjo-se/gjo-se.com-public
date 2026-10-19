/**
 * React-Query + Router wrapper for FBF hook tests.
 *
 * `useSkillGroups` derives the locale from the route, so hooks that depend on
 * it need a router. Queries never retry inside tests.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';

import type { ReactNode } from 'react';

/**
 * Creates a fresh wrapper component with its own query cache.
 *
 * @param initialEntries Router history entries; the first path wins.
 * @returns Wrapper component for `renderHook`.
 */
export function createWrapper(initialEntries: string[] = ['/']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
  };
}
