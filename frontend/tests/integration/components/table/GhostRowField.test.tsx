import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { GhostRowField } from '@src/components/table/GhostRowField';
import { MantineProvider } from '@src/providers/mantine/MantineProvider';

describe('GhostRowField', () => {
  it('renders a text input and reports changes', async () => {
    const onValueChange = vi.fn();
    render(<GhostRowField ghost="text" value="" placeholder="Name" onValueChange={onValueChange} />);

    await userEvent.fill(screen.getByPlaceholderText('Name'), 'Test');

    expect(onValueChange).toHaveBeenCalledWith('Test');
  });

  it('renders a textarea for the textarea kind', async () => {
    const onValueChange = vi.fn();
    render(<GhostRowField ghost="textarea" value="" placeholder="Notiz" onValueChange={onValueChange} />);

    await userEvent.fill(screen.getByPlaceholderText('Notiz'), 'Zeile 1');

    expect(onValueChange).toHaveBeenCalledWith('Zeile 1');
  });

  it('renders the date control for the date kind', () => {
    render(
      <MantineProvider>
        <GhostRowField ghost="date" value="2026-01-01" onValueChange={vi.fn()} />
      </MantineProvider>,
    );

    expect(screen.getByRole('button', { name: '01.01.26' })).toBeVisible();
  });

  it('respects the disabled state', () => {
    render(<GhostRowField ghost="text" value="" placeholder="Name" disabled onValueChange={vi.fn()} />);

    expect(screen.getByPlaceholderText('Name')).toBeDisabled();
  });
});
