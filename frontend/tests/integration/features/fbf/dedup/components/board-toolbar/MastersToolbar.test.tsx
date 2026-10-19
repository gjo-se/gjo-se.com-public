import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import MastersToolbar from '@src/features/fbf/dedup/components/board-toolbar/MastersToolbar';
import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { makeBoardItem, makeBoardPage, resetDedupStore } from '../../../fbfTestUtils';

describe('MastersToolbar', () => {
  beforeEach(() => {
    resetDedupStore();
  });

  it('shows the loaded master total in the count chip', () => {
    useDedupStore.setState({ masters: makeBoardPage({ total: 7 }) });

    render(<MastersToolbar />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('counts the similarity display list when column two leads', () => {
    const selected = makeBoardItem({ id: 1, name: 'TypeScript' });
    useDedupStore.setState({
      sp2Anchor: selected,
      sp2SelectedIds: new Set([1]),
      sp2SelectedItems: [selected],
      similarMasters: [
        { ...makeBoardItem({ id: 2, name: 'JavaScript' }), similarity: 0.8, best_member_name: null, best_member_similarity: null },
        { ...makeBoardItem({ id: 3, name: 'Node.js' }), similarity: 0.7, best_member_name: null, best_member_similarity: null },
      ],
    });

    render(<MastersToolbar />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('debounces the search input into the shared filters', async () => {
    render(<MastersToolbar />);

    await userEvent.type(screen.getByPlaceholderText('Suche…'), 'react');

    await vi.waitFor(() => {
      expect(useDedupStore.getState().filters.q).toBe('react');
    });
  });

  it('falls back to an empty count while no page is loaded', () => {
    render(<MastersToolbar />);

    expect(screen.queryByText('7')).not.toBeInTheDocument();
  });
});
