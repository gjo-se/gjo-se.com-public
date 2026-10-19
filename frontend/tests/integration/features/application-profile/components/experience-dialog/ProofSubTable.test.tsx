import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import ProofSubTable from '@src/features/application-profile/components/experience-dialog/ProofSubTable';

import type { ProofRow } from '@src/features/application-profile/components/experience-dialog/ProofSubTable';

const INITIAL: ProofRow[] = [
  { key: 'proof-1', translations: { de: { text: 'Beleg DE' }, en: { text: 'Beleg EN' } } },
];

/** Stateful harness mirroring the parent that owns the proof rows. */
function Harness({ initial = INITIAL, locale = 'de' }: { initial?: ProofRow[]; locale?: 'de' | 'en' }) {
  const [items, setItems] = useState(initial);
  return <ProofSubTable items={items} locale={locale} onChange={setItems} />;
}

describe('ProofSubTable', () => {
  it('renders the title, subtitle and existing proofs', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { name: 'Proofs' })).toBeInTheDocument();
    expect(screen.getByText('Belege · DE')).toBeInTheDocument();
    expect(screen.getByText('Beleg DE')).toBeInTheDocument();
  });

  it('renders the empty state without proofs', () => {
    render(<Harness initial={[]} />);

    expect(screen.getByText('Keine Proofs vorhanden.')).toBeInTheDocument();
  });

  it('adds an empty proof row', () => {
    render(<Harness initial={[]} />);

    fireEvent.click(screen.getByRole('button', { name: '＋ Proof hinzufügen' }));

    expect(screen.queryByText('Keine Proofs vorhanden.')).not.toBeInTheDocument();
  });

  it('removes a proof', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(screen.queryByText('Beleg DE')).not.toBeInTheDocument();
  });

  it('shows the EN text when the locale switches', () => {
    render(<Harness locale="en" />);

    expect(screen.getByText('Belege · EN')).toBeInTheDocument();
    expect(screen.getByText('Beleg EN')).toBeInTheDocument();
  });
});
