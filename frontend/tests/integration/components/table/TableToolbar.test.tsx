import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import TableToolbar from '@src/components/table/TableToolbar';

describe('TableToolbar', () => {
  it('renders the search input, reset button and entry count', () => {
    render(
      <TableToolbar searchValue="" onSearchChange={vi.fn()} onReset={vi.fn()} total={3} loading={false} />,
    );

    expect(screen.getByPlaceholderText('Suchen…')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeVisible();
    expect(screen.getByText('3 Einträge')).toBeVisible();
  });

  it('uses the singular entry label', () => {
    render(
      <TableToolbar searchValue="" onSearchChange={vi.fn()} onReset={vi.fn()} total={1} loading={false} />,
    );

    expect(screen.getByText('1 Eintrag')).toBeVisible();
  });

  it('hides the count while loading', () => {
    render(
      <TableToolbar searchValue="" onSearchChange={vi.fn()} onReset={vi.fn()} total={3} loading />,
    );

    expect(screen.queryByText('3 Einträge')).not.toBeInTheDocument();
  });

  it('reports search input and reset clicks', async () => {
    const onSearchChange = vi.fn();
    const onReset = vi.fn();
    render(
      <TableToolbar
        searchValue=""
        onSearchChange={onSearchChange}
        onReset={onReset}
        total={0}
        loading={false}
        searchPlaceholder="Projekte suchen…"
      />,
    );

    await userEvent.fill(screen.getByPlaceholderText('Projekte suchen…'), 'Ab');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onSearchChange).toHaveBeenCalledWith('Ab');
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('renders filter elements when provided', () => {
    render(
      <TableToolbar
        searchValue=""
        onSearchChange={vi.fn()}
        onReset={vi.fn()}
        total={0}
        loading={false}
        filterElements={[<button key="filter" type="button">Filter</button>]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Filter' })).toBeVisible();
  });
});
