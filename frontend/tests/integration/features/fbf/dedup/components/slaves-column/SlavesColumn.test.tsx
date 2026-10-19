import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import SlavesColumn from '@src/features/fbf/dedup/components/slaves-column/SlavesColumn';
import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { resetDedupStore } from '../../../fbfTestUtils';

describe('SlavesColumn', () => {
  beforeEach(() => {
    resetDedupStore();
  });

  it('renders the loaded solo masters', async () => {
    render(
      <DndContext>
        <SlavesColumn />
      </DndContext>,
    );

    expect(await screen.findByText('TypeScript')).toBeInTheDocument();
  });

  it('selects a card on click through the board store', async () => {
    render(
      <DndContext>
        <SlavesColumn />
      </DndContext>,
    );

    (await screen.findByText('#1')).click();

    expect(useDedupStore.getState().sp1SelectedIds.has(1)).toBe(true);
  });

  it('renders the empty label for an empty board page', async () => {
    worker.use(
      http.get(`${base}/admin/fbf/dedup/board`, () =>
        HttpResponse.json({
          items: [],
          total: 0,
          page: 0,
          size: 20,
          checked_masters: 0,
          total_masters: 0,
        }),
      ),
    );

    render(
      <DndContext>
        <SlavesColumn />
      </DndContext>,
    );

    expect(
      await screen.findByText('Keine Master ohne Slaves gefunden.'),
    ).toBeInTheDocument();
  });
});
