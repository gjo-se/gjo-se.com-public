import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import GhostRow from '@src/features/portfolio/components/proof-sub-table/GhostRow';

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
  const [data, setData] = useState<Record<string, string>>({
    image_src: '',
    statement: '',
    priority: 'medium',
  });
  return (
    <GhostRow
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

describe('ProofSubTable GhostRow', () => {
  it('renders the image path, the required statement and the priority select', () => {
    renderInTable(<GhostHarness />);

    expect(screen.getByPlaceholderText('Bild-Pfad')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Antwort *')).toBeInTheDocument();
    expect(screen.getByLabelText('Priorität')).toHaveValue('medium');
  });

  it('reports statement input and submits on Enter', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    renderInTable(<GhostHarness onChange={onChange} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByPlaceholderText('Antwort *'), 'Neuer Beweis');
    expect(onChange).toHaveBeenLastCalledWith('statement', 'Neuer Beweis');

    await userEvent.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('reports priority changes', async () => {
    const onChange = vi.fn();
    renderInTable(<GhostHarness onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText('Priorität'), 'high');

    expect(onChange).toHaveBeenCalledWith('priority', 'high');
  });

  it('shows the submit error instead of the inputs', () => {
    renderInTable(<GhostHarness error="Fehler beim Anlegen des Proofs." />);

    expect(screen.getByText('Fehler beim Anlegen des Proofs.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Antwort *')).not.toBeInTheDocument();
  });
});
