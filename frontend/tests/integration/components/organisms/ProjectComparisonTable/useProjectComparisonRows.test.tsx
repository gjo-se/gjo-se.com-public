import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import useProjectComparisonRows from '@src/components/organisms/ProjectComparisonTable/useProjectComparisonRows';

import type { CrmLinks } from '@src/components/organisms/ProjectComparisonTable/ProjectComparisonTable.types';
import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

function column(overrides: Partial<ComparisonColumn> = {}): ComparisonColumn {
  return {
    id: 1,
    canonical: true,
    scoreLabel: 'Kanonisch',
    scoreChip: true,
    title: 'Testprojekt',
    titleNormalized: null,
    city: 'Berlin',
    country: 'DE',
    duration: '6 Monate',
    start: '01/2026',
    remote: '100 %',
    remoteWarn: false,
    jobRole: 'Developer',
    contractType: 'Contracting',
    contractWarn: false,
    postedAt: '01.01.2026',
    postedAtWarn: false,
    freelancermapId: 1,
    freelancermapUrl: null,
    agency: 'Agentur',
    contactName: 'Kontakt',
    description: null,
    skills: [],
    callLogId: null,
    endcustomer: 'Direkt',
    industry: 'IT',
    hourlyRate: 95,
    myHourlyRate: 90,
    myStartDate: null,
    ...overrides,
  };
}

const crm: CrmLinks = {
  personId: null,
  linkId: null,
  personName: null,
  companyId: null,
  companyName: null,
};

function RowsHarness({ col, onRefetch }: { col: ComparisonColumn; onRefetch: () => void }) {
  const rows = useProjectComparisonRows(crm, onRefetch);
  return (
    <MemoryRouter>
      <div>
        {rows.map((row) => (
          <section key={row.label}>
            <h2>{row.label}</h2>
            <div>{row.render(col)}</div>
          </section>
        ))}
      </div>
    </MemoryRouter>
  );
}

describe('useProjectComparisonRows', () => {
  it('exposes the metadata labels in the established order', () => {
    render(<RowsHarness col={column()} onRefetch={vi.fn()} />);

    const labels = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(labels.slice(0, 6)).toEqual([
      'ID (intern)',
      'Endkunde',
      '€/h',
      'my €/h',
      'Branche',
      'Score',
    ]);
    expect(labels).toContain('Titel (Mail)');
    expect(labels).toContain('Agentur');
    expect(labels).toContain('Kontakt');
  });

  it('renders the canonical project data', () => {
    render(<RowsHarness col={column()} onRefetch={vi.fn()} />);

    expect(screen.getByText('1 (kanonisch)')).toBeVisible();
    expect(screen.getByText('Direkt')).toBeVisible();
    expect(screen.getByText('IT')).toBeVisible();
    expect(screen.getByText('Kanonisch')).toBeVisible();
  });

  it('marks a slave project as non-canonical', () => {
    render(
      <RowsHarness
        col={column({ id: 2, canonical: false, scoreLabel: '85 %', scoreChip: false })}
        onRefetch={vi.fn()}
      />,
    );

    expect(screen.getByText('2')).toBeVisible();
    expect(screen.getByText('85 %')).toBeVisible();
  });
});
