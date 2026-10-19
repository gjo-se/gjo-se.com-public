import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import RateEditCell from '@src/components/organisms/ProjectComparisonTable/RateEditCell';

describe('RateEditCell', () => {
  it('shows the current rate or a dash', () => {
    const { rerender } = render(
      <RateEditCell value={95} save={vi.fn()} onRefetch={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: '95' })).toBeVisible();

    rerender(<RateEditCell value={null} save={vi.fn()} onRefetch={vi.fn()} />);
    expect(screen.getByRole('button', { name: '–' })).toBeVisible();
  });

  it('parses a decimal comma and saves the rate', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const onRefetch = vi.fn();
    render(<RateEditCell value={95} save={save} onRefetch={onRefetch} />);

    await userEvent.click(screen.getByRole('button', { name: '95' }));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '120,5{Enter}');

    await waitFor(() => expect(onRefetch).toHaveBeenCalledOnce());
    expect(save).toHaveBeenCalledWith(120.5);
  });

  it('clears the rate for an empty value', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const onRefetch = vi.fn();
    render(<RateEditCell value={95} save={save} onRefetch={onRefetch} />);

    await userEvent.click(screen.getByRole('button', { name: '95' }));
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(save).toHaveBeenCalledWith(null));
  });

  it('rejects a non-numeric rate', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<RateEditCell value={null} save={save} onRefetch={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '–' }));
    await userEvent.type(screen.getByRole('textbox'), 'abc{Enter}');

    expect(save).not.toHaveBeenCalled();
  });
});
