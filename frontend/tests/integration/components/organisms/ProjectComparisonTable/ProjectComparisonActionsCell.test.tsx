import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProjectComparisonActionsCell from '@src/components/organisms/ProjectComparisonTable/ProjectComparisonActionsCell';

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
    freelancermapUrl: '/admin/aiscope/freelancermap/1',
    agency: 'Agentur',
    contactName: 'Kontakt',
    description: null,
    skills: [],
    callLogId: 7,
    endcustomer: '–',
    industry: null,
    hourlyRate: null,
    myHourlyRate: null,
    myStartDate: null,
    ...overrides,
  };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof ProjectComparisonActionsCell>> = {}) {
  return {
    col: column(),
    canonicalProjectId: 1,
    status: null,
    statusColor: null,
    promotedTo: null,
    isPromoting: false,
    persistCallLogId: 7,
    enriched: false,
    estimatingRate: false,
    onPromoteToggle: vi.fn(),
    onEnrich: vi.fn(),
    onEstimateRate: vi.fn(),
    onUnlink: vi.fn(),
    ...overrides,
  };
}

describe('ProjectComparisonActionsCell', () => {
  it('renders the canonical actions and the raw-data link', () => {
    render(
      <MemoryRouter>
        <ProjectComparisonActionsCell {...baseProps()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Rohdaten anzeigen' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Als Golden speichern' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Als Fehlerfall speichern' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Kontaktdaten besorgen' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Stundensatz schätzen (regelbasiert)' })).toBeEnabled();
  });

  it('disables the dataset actions without a merge call log', () => {
    render(
      <MemoryRouter>
        <ProjectComparisonActionsCell {...baseProps({ persistCallLogId: null })} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Als Golden speichern' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Als Fehlerfall speichern' })).toBeDisabled();
  });

  it('reports the promote, enrich and estimate actions', async () => {
    const props = baseProps();
    render(
      <MemoryRouter>
        <ProjectComparisonActionsCell {...props} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Als Golden speichern' }));
    await userEvent.click(screen.getByRole('button', { name: 'Kontaktdaten besorgen' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Stundensatz schätzen (regelbasiert)' }),
    );

    expect(props.onPromoteToggle).toHaveBeenCalledWith('golden');
    expect(props.onEnrich).toHaveBeenCalledWith(props.col);
    expect(props.onEstimateRate).toHaveBeenCalledWith(1);
  });

  it('offers the unlink action for slave columns', async () => {
    const onUnlink = vi.fn();
    render(
      <MemoryRouter>
        <ProjectComparisonActionsCell
          {...baseProps({ col: column({ canonical: false }), onUnlink })}
        />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Vom Master trennen' }));

    expect(onUnlink).toHaveBeenCalledOnce();
  });

  it('disables enrichment for already enriched columns', () => {
    render(
      <MemoryRouter>
        <ProjectComparisonActionsCell {...baseProps({ enriched: true })} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Kontaktdaten bereits angereichert' }),
    ).toBeDisabled();
  });
});
