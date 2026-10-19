import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import DescriptionCell from '@src/features/fbf/skill/components/data-table/DescriptionCell';

describe('DescriptionCell', () => {
  it('renders the description text', () => {
    render(<DescriptionCell value="Typsicheres JavaScript." onCommit={() => undefined} />);

    expect(screen.getByText('Typsicheres JavaScript.')).toBeInTheDocument();
  });

  it('renders a dash for a missing description', () => {
    render(<DescriptionCell value={null} onCommit={() => undefined} />);

    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('commits the trimmed description on Enter', async () => {
    const onCommit = vi.fn();
    render(<DescriptionCell value="Alt" onCommit={onCommit} />);

    fireEvent.click(screen.getByText('Alt'));
    const textarea = await screen.findByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, '  Neu  ');
    await userEvent.keyboard('{Enter}');

    expect(onCommit).toHaveBeenCalledWith('Neu');
  });

  it('saves an empty description as null', async () => {
    const onCommit = vi.fn();
    render(<DescriptionCell value="Alt" onCommit={onCommit} />);

    fireEvent.click(screen.getByText('Alt'));
    await userEvent.clear(await screen.findByRole('textbox'));
    await userEvent.keyboard('{Enter}');

    expect(onCommit).toHaveBeenCalledWith(null);
  });

  it('reverts the draft on Escape', async () => {
    const onCommit = vi.fn();
    render(<DescriptionCell value="Alt" onCommit={onCommit} />);

    fireEvent.click(screen.getByText('Alt'));
    await userEvent.type(await screen.findByRole('textbox'), 'Neu');
    await userEvent.keyboard('{Escape}');

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText('Alt')).toBeInTheDocument();
  });
});
