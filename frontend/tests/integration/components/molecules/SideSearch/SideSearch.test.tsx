import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SideSearch from '@src/components/molecules/SideSearch/SideSearch';

describe('SideSearch', () => {
  it('renders the current value with the placeholder', () => {
    render(<SideSearch value="React" onChange={vi.fn()} placeholder="Komponente suchen..." />);

    expect(screen.getByPlaceholderText('Komponente suchen...')).toHaveValue('React');
  });

  it('reports typed characters to the change handler', async () => {
    const onChange = vi.fn();
    render(<SideSearch value="" onChange={onChange} placeholder="Suchen..." />);

    await userEvent.type(screen.getByPlaceholderText('Suchen...'), 'Docker');

    expect(onChange).toHaveBeenCalled();
  });

  it('clears the search when Escape is pressed', async () => {
    const onChange = vi.fn();
    render(<SideSearch value="React" onChange={onChange} placeholder="Suchen..." />);

    await userEvent.click(screen.getByPlaceholderText('Suchen...'));
    await userEvent.keyboard('{Escape}');

    expect(onChange).toHaveBeenCalledWith('');
  });
});
