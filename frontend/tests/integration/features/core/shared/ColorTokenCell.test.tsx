import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import ColorTokenCell from '@src/features/core/shared/ColorTokenCell';

function renderCell(value: string, onSave = vi.fn()) {
  return render(
    <MantineProvider>
      <ColorTokenCell value={value} onSave={onSave} />
    </MantineProvider>,
  );
}

describe('ColorTokenCell', () => {
  it('renders the color label and hex for a known token', () => {
    renderCell('blue');

    expect(screen.getByText(/· #/)).toBeInTheDocument();
  });

  it('falls back to the raw value for an unknown token', () => {
    renderCell('unknown-token');

    expect(screen.getByText('unknown-token')).toBeInTheDocument();
  });

  it('saves the selected color and closes the popover', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderCell('blue', onSave);

    fireEvent.click(screen.getByText(/· #/));
    const swatches = await screen.findAllByRole('radio');
    fireEvent.click(swatches[1]);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expect.any(String));
  });
});
