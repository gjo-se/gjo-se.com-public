import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SearchBar from '@src/components/forms/SearchBar/SearchBar';

describe('SearchBar', () => {
  it('renders the current value with an accessible label', () => {
    render(<SearchBar value="abc" onChange={vi.fn()} placeholder="Projekte suchen..." />);

    expect(screen.getByRole('textbox', { name: 'Projekte suchen...' })).toHaveValue('abc');
  });

  it('reports typed input', async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} placeholder="Suchen..." />);

    await userEvent.fill(screen.getByRole('textbox', { name: 'Suchen...' }), 'Re');

    expect(onChange).toHaveBeenCalledWith('Re');
  });

  it('offers a clear control only with content', async () => {
    const onChange = vi.fn();
    render(<SearchBar value="abc" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Suche zurücksetzen' }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('hides the clear control for an empty query', () => {
    render(<SearchBar value="" onChange={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Suche zurücksetzen' })).not.toBeInTheDocument();
  });
});
