/**
 * Shared render helpers for the FBF integration tests.
 *
 * Provides the app-level providers the rendered units need (TanStack Query,
 * Auth, Mantine, Router) and a deterministic dedup-board baseline. I/O always
 * runs through the shared MSW worker from `tests/setup/browser.ts`.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AuthProvider } from '@src/contexts/AuthContext';
import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';
import { DEFAULT_FILTERS } from '@src/features/fbf/dedup/store/types';import { MantineProvider } from '@src/providers/mantine/MantineProvider';

import type { BoardItem, BoardPage } from '@src/features/fbf/dedup/services/dedup';
import type { ReactElement } from 'react';

/** Options controlling the router entry and the matching route pattern. */
export interface RenderFbfOptions {
  /** URL the unit is mounted at (drives `useParams` + search params). */
  route?: string;
  /** Route pattern used to mount the unit (must contain the route params). */
  path?: string;
  /** Wrap in `AuthProvider` (admin pages that resolve the current user). */
  withAuth?: boolean;
}

/**
 * Renders an FBF unit with Query, Mantine and Router providers.
 *
 * @param ui Element under test.
 * @param options Router entry/pattern plus the optional auth provider.
 * @returns The Testing Library render result.
 */
export function renderFbf(
  ui: ReactElement,
  { route = '/', path = '*', withAuth = false }: RenderFbfOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const tree = (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>
  );

  return render(withAuth ? <AuthProvider>{tree}</AuthProvider> : tree);
}

/** Builds a board item with sane defaults. */
export function makeBoardItem(overrides: Partial<BoardItem> = {}): BoardItem {
  return {
    id: 1,
    name: 'TypeScript',
    description: 'Typsicheres JavaScript.',
    status: 'pending',
    canonical_id: null,
    master_name: null,
    alias_count: 0,
    importance: 4,
    level: 3,
    level_public: 3,
    ...overrides,
  };
}

/** Builds a board page with sane defaults. */
export function makeBoardPage(overrides: Partial<BoardPage> = {}): BoardPage {
  return {
    items: [makeBoardItem()],
    total: 1,
    page: 0,
    size: 20,
    checked_masters: 0,
    total_masters: 1,
    ...overrides,
  };
}

/**
 * Resets the shared dedup store to a deterministic baseline.
 *
 * The store is the public state contract of the board columns/toolbars; tests
 * seed it instead of relying on whatever a previous test left behind.
 */
export function resetDedupStore(): void {
  useDedupStore.setState({
    masters: null,
    slaves: null,
    pinnedItem: null,
    pinnedMasterSlaves: null,
    suggestions: null,
    suggestionsLoading: false,
    filters: { ...DEFAULT_FILTERS },
    loading: false,
    error: null,
    sp1SelectedIds: new Set<number>(),
    sp1SelectedItems: [],
    sp1Anchor: null,
    sp2SelectedIds: new Set<number>(),
    sp2SelectedItems: [],
    sp2Anchor: null,
    sp3SelectedIds: new Set<number>(),
    sp3SelectedItems: [],
    sp3Anchor: null,
    dragActive: false,
    similarMasters: null,
    similarSlaves: null,
    similarLoading: false,
    skippedSlaveIds: [],
    autoAdvance: false,
    slaveStatus: 'pending',
    slaveQ: '',
    pinnedSlavesStatus: 'pending',
    pinnedSlavesQ: '',
  });
}
