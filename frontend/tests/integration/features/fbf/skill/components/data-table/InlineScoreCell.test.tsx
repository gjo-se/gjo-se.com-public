import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import InlineScoreCell from '@src/features/fbf/skill/components/data-table/InlineScoreCell';

describe('InlineScoreCell', () => {
  it('renders the numeric score', () => {
    render(
      <InlineScoreCell value={3} field="level" onCommit={() => undefined} />,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders a dash for a missing score', () => {
    render(
      <InlineScoreCell value={null} field="importance" onCommit={() => undefined} />,
    );

    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('offers the level options when opened', async () => {
    render(<InlineScoreCell value={3} field="level" onCommit={() => undefined} />);

    fireEvent.click(screen.getByText('3'));
    fireEvent.click(await screen.findByPlaceholderText('3'));
    await userEvent.keyboard('{ArrowDown}');

    expect(await screen.findByText('4 – Experte')).toBeInTheDocument();
  });

  it('commits a keyboard-selected score', async () => {
    const onCommit = vi.fn();
    render(<InlineScoreCell value={3} field="level" onCommit={onCommit} />);

    fireEvent.click(screen.getByText('3'));
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(onCommit).toHaveBeenCalledWith(0);
  });

  it('offers importance-specific options only', async () => {
    render(
      <InlineScoreCell value={2} field="importance" onCommit={() => undefined} />,
    );

    fireEvent.click(screen.getByText('2'));
    fireEvent.click(await screen.findByPlaceholderText('2'));
    await userEvent.keyboard('{ArrowDown}');

    expect(await screen.findByText('5 – Must-Have')).toBeInTheDocument();
    expect(screen.queryByText('4 – Experte')).not.toBeInTheDocument();
  });
});
