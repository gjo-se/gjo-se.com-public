import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import DedupDndContext from '@src/features/fbf/dedup/components/dedup-dnd-context/DedupDndContext';
import DropZoneBar from '@src/features/fbf/dedup/components/drop-zone-bar/DropZoneBar';
import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { resetDedupStore } from '../../../fbfTestUtils';

describe('DropZoneBar', () => {
  beforeEach(() => {
    resetDedupStore();
  });

  it('renders all four status drop targets', () => {
    render(
      <DedupDndContext>
        <DropZoneBar />
      </DedupDndContext>,
    );

    expect(screen.getByText('deprecated')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('keeps the overlay hidden and aria-hidden while idle', () => {
    const { container } = render(
      <DedupDndContext>
        <DropZoneBar />
      </DedupDndContext>,
    );

    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass('opacity-0');
  });

  it('stays hidden while the store drag flag is set without a real drag', () => {
    useDedupStore.setState({ dragActive: true });

    render(
      <DedupDndContext>
        <DropZoneBar />
      </DedupDndContext>,
    );

    expect(screen.getByText('pending').closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
