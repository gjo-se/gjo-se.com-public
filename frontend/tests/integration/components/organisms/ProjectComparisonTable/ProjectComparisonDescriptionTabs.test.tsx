import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProjectComparisonDescriptionTabs from '@src/components/organisms/ProjectComparisonTable/ProjectComparisonDescriptionTabs';

import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

function column(id: number, canonical: boolean, description: string | null): ComparisonColumn {
  return {
    id,
    canonical,
    scoreLabel: canonical ? 'Kanonisch' : '85 %',
    scoreChip: canonical,
    title: `Projekt ${id}`,
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
    freelancermapId: id,
    freelancermapUrl: null,
    agency: 'Agentur',
    contactName: 'Kontakt',
    description,
    skills: [],
    callLogId: null,
    endcustomer: '–',
    industry: null,
    hourlyRate: null,
    myHourlyRate: null,
    myStartDate: null,
  };
}

const columns = [
  column(1, true, 'Master Beschreibung'),
  column(2, false, null),
];

describe('ProjectComparisonDescriptionTabs', () => {
  it('shows the merged summary tab first', () => {
    render(
      <ProjectComparisonDescriptionTabs
        columns={columns}
        colWidths={[160, 300, 300]}
        mergeDirty={false}
        merging={false}
        mergedDescription={null}
        streamingText={null}
      />,
    );

    expect(screen.getByText('Noch keine Zusammenfassung vorhanden.')).toBeVisible();
  });

  it('shows the description of the selected project tab', async () => {
    render(
      <ProjectComparisonDescriptionTabs
        columns={columns}
        colWidths={[160, 300, 300]}
        mergeDirty={false}
        merging={false}
        mergedDescription={null}
        streamingText={null}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '#1' }));

    expect(screen.getByText('Master Beschreibung')).toBeVisible();
  });

  it('shows the empty hint for a project without description', async () => {
    render(
      <ProjectComparisonDescriptionTabs
        columns={columns}
        colWidths={[160, 300, 300]}
        mergeDirty={false}
        merging={false}
        mergedDescription={null}
        streamingText={null}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '#2 (85 %)' }));

    expect(screen.getByText('Keine Beschreibung vorhanden.')).toBeVisible();
  });

  it('reports the merge request and the stale hint', async () => {
    const onMerge = vi.fn();
    render(
      <ProjectComparisonDescriptionTabs
        columns={columns}
        colWidths={[160, 300, 300]}
        mergeDirty
        merging={false}
        mergedDescription={null}
        streamingText={null}
        onMerge={onMerge}
      />,
    );

    expect(screen.getByText('Gruppe geändert – Zusammenfassung veraltet.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Zusammenfassung erstellen' }));

    expect(onMerge).toHaveBeenCalledOnce();
  });

  it('offers a regeneration for an existing summary', () => {
    render(
      <ProjectComparisonDescriptionTabs
        columns={columns}
        colWidths={[160, 300, 300]}
        mergeDirty={false}
        merging={false}
        mergedDescription="Zusammengefasste Beschreibung"
        streamingText={null}
        onMerge={vi.fn()}
      />,
    );

    expect(screen.getByText('Zusammengefasste Beschreibung')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Neu generieren' })).toBeVisible();
  });
});
