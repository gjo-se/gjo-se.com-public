import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import DecisionSubTable from '@src/features/application-profile/components/experience-dialog/DecisionSubTable';

import type { DecisionRow } from '@src/features/application-profile/components/experience-dialog/DecisionSubTable';

const INITIAL: DecisionRow[] = [
  {
    key: 'decision-1',
    translations: {
      de: { title: 'Titel DE', body: 'Inhalt DE', discarded: 'Verworfen DE' },
      en: { title: 'Title EN', body: 'Body EN', discarded: 'Discarded EN' },
    },
  },
];

/** Stateful harness mirroring the parent that owns the decision rows. */
function Harness({ initial = INITIAL, locale = 'de' }: { initial?: DecisionRow[]; locale?: 'de' | 'en' }) {
  const [items, setItems] = useState(initial);
  return <DecisionSubTable items={items} locale={locale} onChange={setItems} />;
}

describe('DecisionSubTable', () => {
  it('renders the title, subtitle and existing decisions', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { name: 'Entscheidungen' })).toBeInTheDocument();
    expect(screen.getByText('Lösung WIE · DE')).toBeInTheDocument();
    expect(screen.getByText('Titel DE')).toBeInTheDocument();
  });

  it('renders the empty state without decisions', () => {
    render(<Harness initial={[]} />);

    expect(screen.getByText('Keine Entscheidungen vorhanden.')).toBeInTheDocument();
  });

  it('adds an empty decision row', () => {
    render(<Harness initial={[]} />);

    fireEvent.click(screen.getByRole('button', { name: '＋ Entscheidung hinzufügen' }));

    expect(screen.queryByText('Keine Entscheidungen vorhanden.')).not.toBeInTheDocument();
  });

  it('removes a decision after confirmation', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(screen.queryByText('Titel DE')).not.toBeInTheDocument();
  });

  it('shows the EN fields when the locale switches', () => {
    render(<Harness locale="en" />);

    expect(screen.getByText('Lösung WIE · EN')).toBeInTheDocument();
    expect(screen.getByText('Title EN')).toBeInTheDocument();
    expect(screen.queryByText('Titel DE')).not.toBeInTheDocument();
  });
});
