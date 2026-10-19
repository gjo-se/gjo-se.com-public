import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import PinnedSlavesToolbar from '@src/features/fbf/dedup/components/board-toolbar/PinnedSlavesToolbar';
import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { makeBoardItem, makeBoardPage, resetDedupStore } from '../../../fbfTestUtils';

describe('PinnedSlavesToolbar', () => {
  beforeEach(() => {
    resetDedupStore();
  });

  it('shows the pinned master alias total in the count chip', () => {
    useDedupStore.setState({
      pinnedItem: makeBoardItem({ id: 9, name: 'Backend', alias_count: 2 }),
      pinnedMasterSlaves: makeBoardPage({ total: 3 }),
    });

    render(<PinnedSlavesToolbar />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows a zero count while no master is pinned', () => {
    render(<PinnedSlavesToolbar />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('debounces the search input into the pinned-slaves filter', async () => {
    render(<PinnedSlavesToolbar />);

    await userEvent.type(screen.getByPlaceholderText('Suche…'), 'sql');

    await vi.waitFor(() => {
      expect(useDedupStore.getState().pinnedSlavesQ).toBe('sql');
    });
  });

  it('reports the active pinned-slaves status as placeholder', () => {
    useDedupStore.setState({ pinnedSlavesStatus: 'active' });

    render(<PinnedSlavesToolbar />);

    expect(screen.getByPlaceholderText('active')).toBeInTheDocument();
  });
});
