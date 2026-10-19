import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import PinnedInfoPanel from '@src/features/fbf/dedup/components/pinned-info-panel/PinnedInfoPanel';
import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { makeBoardItem, resetDedupStore } from '../../../fbfTestUtils';

describe('PinnedInfoPanel', () => {
  beforeEach(() => {
    resetDedupStore();
  });

  it('shows the empty placeholder while no master is pinned', () => {
    render(
      <DndContext>
        <PinnedInfoPanel />
      </DndContext>,
    );

    expect(screen.getByText('Kein Skill ausgewählt.')).toBeInTheDocument();
  });

  it('shows the placeholder for a pinned master without slaves', () => {
    useDedupStore.setState({ pinnedItem: makeBoardItem({ alias_count: 0 }) });

    render(
      <DndContext>
        <PinnedInfoPanel />
      </DndContext>,
    );

    expect(screen.getByText('Kein Skill ausgewählt.')).toBeInTheDocument();
  });

  it('renders the slaves of the pinned master', async () => {
    useDedupStore.setState({
      pinnedItem: makeBoardItem({ id: 9, name: 'Backend', alias_count: 2 }),
    });

    render(
      <DndContext>
        <PinnedInfoPanel />
      </DndContext>,
    );

    expect(await screen.findByText('TypeScript')).toBeInTheDocument();
  });

  it('renders the alias load error', async () => {
    useDedupStore.setState({
      pinnedItem: makeBoardItem({ id: 9, name: 'Backend', alias_count: 2 }),
    });
    worker.use(
      http.get(`${base}/admin/fbf/dedup/board`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );

    render(
      <DndContext>
        <PinnedInfoPanel />
      </DndContext>,
    );

    expect(await screen.findByText('Fehler beim Laden der Aliase.')).toBeInTheDocument();
  });
});
