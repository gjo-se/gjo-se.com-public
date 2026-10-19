import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ColumnToolbar from '@src/features/fbf/dedup/components/board-toolbar/ColumnToolbar';

/** Stateful harness mirroring a column that owns its search value. */
function SearchHarness({ onSearchChange }: { onSearchChange: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <ColumnToolbar
      searchValue={value}
      onSearchChange={(next) => {
        setValue(next);
        onSearchChange(next);
      }}
      status=""
      onStatusChange={() => undefined}
      count={5}
    />
  );
}

describe('ColumnToolbar', () => {
  it('renders search input, status placeholder and count chip', () => {
    render(
      <ColumnToolbar
        searchValue=""
        onSearchChange={() => undefined}
        status=""
        onStatusChange={() => undefined}
        count={5}
      />,
    );

    expect(screen.getByPlaceholderText('Suche…')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('all')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows the active status as the combobox placeholder', () => {
    render(
      <ColumnToolbar
        searchValue=""
        onSearchChange={() => undefined}
        status="active"
        onStatusChange={() => undefined}
      />,
    );

    expect(screen.getByPlaceholderText('active')).toBeInTheDocument();
  });

  it('reports the full search value as it is typed', async () => {
    const onSearchChange = vi.fn();
    render(<SearchHarness onSearchChange={onSearchChange} />);

    await userEvent.type(screen.getByPlaceholderText('Suche…'), 'abc');

    expect(onSearchChange).toHaveBeenLastCalledWith('abc');
  });

  it('clears the search on Escape', async () => {
    const onSearchChange = vi.fn();
    render(<SearchHarness onSearchChange={onSearchChange} />);

    await userEvent.type(screen.getByPlaceholderText('Suche…'), 'abc');
    await userEvent.keyboard('{Escape}');

    expect(onSearchChange).toHaveBeenLastCalledWith('');
  });

  it('omits the count chip when no count is passed', () => {
    render(
      <ColumnToolbar
        searchValue=""
        onSearchChange={() => undefined}
        status=""
        onStatusChange={() => undefined}
      />,
    );

    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });
});
