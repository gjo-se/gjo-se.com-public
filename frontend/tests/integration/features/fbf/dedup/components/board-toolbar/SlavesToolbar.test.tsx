import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SlavesToolbar from '@src/features/fbf/dedup/components/board-toolbar/SlavesToolbar';
import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { makeBoardItem, makeBoardPage, resetDedupStore } from '../../../fbfTestUtils';

describe('SlavesToolbar', () => {
  beforeEach(() => {
    resetDedupStore();
  });

  it('shows the loaded solo-master total in the count chip', () => {
    useDedupStore.setState({ slaves: makeBoardPage({ total: 4 }) });

    render(<SlavesToolbar />);

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('counts the similarity display list when column one leads', () => {
    const selected = makeBoardItem({ id: 1, name: 'TypeScript' });
    useDedupStore.setState({
      sp1Anchor: selected,
      sp1SelectedIds: new Set([1]),
      sp1SelectedItems: [selected],
      similarSlaves: [{ ...makeBoardItem({ id: 2, name: 'JavaScript' }), similarity: 0.9, best_member_name: null, best_member_similarity: null }],
    });

    render(<SlavesToolbar />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('debounces the search input into the slave filter', async () => {
    render(<SlavesToolbar />);

    await userEvent.type(screen.getByPlaceholderText('Suche…'), 'graph');

    await vi.waitFor(() => {
      expect(useDedupStore.getState().slaveQ).toBe('graph');
    });
  });

  it('reports the active slave status as placeholder', () => {
    useDedupStore.setState({ slaveStatus: 'rejected' });

    render(<SlavesToolbar />);

    expect(screen.getByPlaceholderText('rejected')).toBeInTheDocument();
  });
});
