import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import DedupDndContext from '@src/features/fbf/dedup/components/dedup-dnd-context/DedupDndContext';

import { resetDedupStore } from '../../../fbfTestUtils';

/** Minimal interactive child to prove events pass through the DnD context. */
function CounterChild() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      Zähler: {count}
    </button>
  );
}

describe('DedupDndContext', () => {
  beforeEach(() => {
    resetDedupStore();
  });

  it('renders its children', () => {
    render(
      <DedupDndContext>
        <span>Board-Inhalt</span>
      </DedupDndContext>,
    );

    expect(screen.getByText('Board-Inhalt')).toBeInTheDocument();
  });

  it('lets child interactions pass through the drag context', async () => {
    render(
      <DedupDndContext>
        <CounterChild />
      </DedupDndContext>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Zähler: 0' }));

    expect(screen.getByRole('button', { name: 'Zähler: 1' })).toBeInTheDocument();
  });

  it('renders with an active selection from the board store', () => {
    render(
      <DedupDndContext>
        <span>Board-Inhalt</span>
      </DedupDndContext>,
    );

    expect(screen.queryByText('+1')).not.toBeInTheDocument();
  });
});
