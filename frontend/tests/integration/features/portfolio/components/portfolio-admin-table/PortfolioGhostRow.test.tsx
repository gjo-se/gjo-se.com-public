import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import PortfolioGhostRow from '@src/features/portfolio/components/portfolio-admin-table/PortfolioGhostRow';

import { renderInTable } from '../../../integrationTestUtils';

/** Stateful harness mirroring the parent that owns the ghost data. */
function GhostHarness({
  onChange = vi.fn(),
  onSubmit = vi.fn(),
  error = null,
}: {
  onChange?: (field: string, value: string) => void
  onSubmit?: () => void
  error?: string | null
}) {
  const [data, setData] = useState<Record<string, string>>({ slug: '' });
  return (
    <PortfolioGhostRow
      saving={false}
      data={data}
      onChange={(field, value) => {
        setData((prev) => ({ ...prev, [field]: value }));
        onChange(field, value);
      }}
      onSubmit={onSubmit}
      error={error}
    />
  );
}

describe('PortfolioGhostRow', () => {
  it('renders the required slug input', () => {
    renderInTable(<GhostHarness />);

    expect(screen.getByPlaceholderText('Slug *')).toBeInTheDocument();
  });

  it('reports slug changes', async () => {
    const onChange = vi.fn();
    renderInTable(<GhostHarness onChange={onChange} />);

    await userEvent.type(screen.getByPlaceholderText('Slug *'), 'neu');

    expect(onChange).toHaveBeenLastCalledWith('slug', 'neu');
  });

  it('submits on Enter and marks an empty required field', async () => {
    const onSubmit = vi.fn();
    renderInTable(<GhostHarness onSubmit={onSubmit} />);

    await userEvent.click(screen.getByPlaceholderText('Slug *'));
    await userEvent.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Pflichtfeld')).toBeInTheDocument();
  });

  it('shows the create error instead of the inputs', () => {
    renderInTable(<GhostHarness error="Slug ist erforderlich." />);

    expect(screen.getByText('Slug ist erforderlich.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Slug *')).not.toBeInTheDocument();
  });
});
