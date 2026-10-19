import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import MastersColumn from '@src/features/fbf/dedup/components/masters-column/MastersColumn';
import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';
import { base } from '@src/mocks/handlers/shared';

import { worker } from '@src/mocks/browser';

import { resetDedupStore } from '../../../fbfTestUtils';

describe('MastersColumn', () => {
  beforeEach(() => {
    resetDedupStore();
  });

  it('renders the loaded masters with slaves', async () => {
    render(
      <DndContext>
        <MastersColumn />
      </DndContext>,
    );

    expect(await screen.findByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('selects a card on click through the board store', async () => {
    render(
      <DndContext>
        <MastersColumn />
      </DndContext>,
    );

    (await screen.findByText('#1')).click();

    expect(useDedupStore.getState().sp2SelectedIds.has(1)).toBe(true);
  });

  it('renders the load error instead of cards', async () => {
    worker.use(
      http.get(`${base}/admin/fbf/dedup/board`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );

    render(
      <DndContext>
        <MastersColumn />
      </DndContext>,
    );

    expect(await screen.findByText('Fehler beim Laden der Masters.')).toBeInTheDocument();
  });
});
