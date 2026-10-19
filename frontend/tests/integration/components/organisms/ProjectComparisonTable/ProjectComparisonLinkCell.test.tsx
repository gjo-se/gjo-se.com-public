import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProjectComparisonLinkCell from '@src/components/organisms/ProjectComparisonTable/ProjectComparisonLinkCell';

import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

function column(canonical: boolean): ComparisonColumn {
  return {
    id: 1,
    canonical,
    scoreLabel: 'Kanonisch',
    scoreChip: canonical,
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
    endcustomer: '–',
    industry: null,
    hourlyRate: null,
    myHourlyRate: null,
    myStartDate: null,
  };
}

describe('ProjectComparisonLinkCell', () => {
  it('offers the add-slave picker for a canonical column', async () => {
    render(
      <ProjectComparisonLinkCell col={column(true)} canonicalProjectId={1} onRefetch={vi.fn()} />,
    );

    const input = screen.getByPlaceholderText('Projekt-ID oder Titel…');
    await userEvent.fill(input, 'Nichts');

    expect(await screen.findByText('Keine verknüpfbaren Projekte gefunden')).toBeVisible();
  });

  it('renders no picker for a canonical column without canonical id', () => {
    render(<ProjectComparisonLinkCell col={column(true)} onRefetch={vi.fn()} />);

    expect(screen.queryByPlaceholderText('Projekt-ID oder Titel…')).not.toBeInTheDocument();
  });

  it('offers the change-master picker for a slave column', async () => {
    render(
      <ProjectComparisonLinkCell col={column(false)} canonicalProjectId={1} onRefetch={vi.fn()} />,
    );

    const input = screen.getByPlaceholderText('Projekt-ID oder Titel…');
    await userEvent.fill(input, 'Nichts');

    expect(await screen.findByText('Keine Master-Projekte gefunden')).toBeVisible();
  });
});
