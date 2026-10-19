import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ReasoningCombobox from '@src/features/llm/shared/ReasoningCombobox';

describe('ReasoningCombobox', () => {
  it('shows the current reasoning level as the input placeholder', () => {
    render(<ReasoningCombobox value="medium" configId={7} onSave={vi.fn()} />);

    expect(screen.getByPlaceholderText('medium')).toBeInTheDocument();
  });

  it('filters the options by the typed search term', async () => {
    render(<ReasoningCombobox value="medium" configId={7} onSave={vi.fn()} />);

    const input = screen.getByPlaceholderText('medium');
    await userEvent.click(input);
    fireEvent.change(input, { target: { value: 'high' } });

    expect(await screen.findByRole('option', { name: 'high' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'low' })).not.toBeInTheDocument();
  });

  it('saves the selected reasoning level for the config', async () => {
    const onSave = vi.fn();
    render(<ReasoningCombobox value="medium" configId={7} onSave={onSave} />);

    await userEvent.click(screen.getByPlaceholderText('medium'));
    fireEvent.click(await screen.findByRole('option', { name: 'high' }));

    expect(onSave).toHaveBeenCalledWith(7, 'reasoning', 'high');
  });
});
