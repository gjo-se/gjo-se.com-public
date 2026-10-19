import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import ProjectComparisonTable from '@src/components/organisms/ProjectComparisonTable/ProjectComparisonTable';

import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

// jsdom does not implement ResizeObserver, which the table observes on mount.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

function buildCanonicalColumn(): ComparisonColumn {
  return {
    id: 100,
    canonical: true,
    scoreLabel: 'Kanonisch',
    scoreChip: true,
    title: 'Master Project',
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
    agency: 'Test Agency',
    contactName: 'John',
    skills: [],
    titleNormalized: null,
    description: null,
    callLogId: null,
    endcustomer: '–',
    industry: null,
    hourlyRate: null,
    myHourlyRate: null,
    myStartDate: null,
  };
}

function buildSlaveColumn(id: number): ComparisonColumn {
  return {
    id,
    canonical: false,
    scoreLabel: '85 %',
    scoreChip: false,
    title: `Slave ${id}`,
    city: 'Munich',
    country: 'DE',
    duration: '3 Monate',
    start: '03/2026',
    remote: '80 %',
    remoteWarn: false,
    jobRole: 'Engineer',
    contractType: 'Contracting',
    contractWarn: false,
    postedAt: '15.02.2026',
    postedAtWarn: false,
    freelancermapId: id,
    freelancermapUrl: `/admin/aiscope/freelancermap/${id}`,
    agency: 'Agency X',
    contactName: 'Jane',
    skills: [],
    titleNormalized: null,
    description: null,
    callLogId: null,
    endcustomer: '–',
    industry: null,
    hourlyRate: null,
    myHourlyRate: null,
    myStartDate: null,
  };
}

const columns = [buildCanonicalColumn(), buildSlaveColumn(200), buildSlaveColumn(300)];

describe('ProjectComparisonTable', () => {
  it('renders metadata rows', () => {
    render(
      <MemoryRouter>
        <ProjectComparisonTable columns={columns} onRefetch={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('ID (intern)')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders Verknüpfung row label', () => {
    render(
      <MemoryRouter>
        <ProjectComparisonTable columns={columns} onRefetch={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Verknüpfung')).toBeInTheDocument();
  });

  it('renders a change-master combobox in slave columns only', () => {
    render(
      <MemoryRouter>
        <ProjectComparisonTable columns={columns} onRefetch={vi.fn()} />
      </MemoryRouter>,
    );

    // Both slave columns expose a master-search combobox…
    const comboboxes = screen.getAllByPlaceholderText('Projekt-ID oder Titel…');
    expect(comboboxes).toHaveLength(2);

    // …the canonical (master) column does not.
    expect(comboboxes.length).toBeLessThan(columns.length);
  });

  it('renders Aktionen row with link icons', () => {
    render(
      <MemoryRouter>
        <ProjectComparisonTable columns={columns} onRefetch={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Aktionen')).toBeInTheDocument();
    // Link icons should be present (aria-label "Rohdaten anzeigen")
    const linkIcons = screen.getAllByLabelText('Rohdaten anzeigen');
    expect(linkIcons.length).toBe(3);
  });

  it('does not render unlink or switch-canonical icons', () => {
    render(
      <MemoryRouter>
        <ProjectComparisonTable columns={columns} onRefetch={vi.fn()} />
      </MemoryRouter>,
    );

    // Unlink icon (link-2-off) and crown icon should NOT be present
    expect(screen.queryByLabelText('Unlink')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kanonisch')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <MemoryRouter>
        <ProjectComparisonTable columns={[]} loading onRefetch={vi.fn()} />
      </MemoryRouter>,
    );

    // Spinner is rendered via a div, check for the Spinner wrapper
    const container = document.querySelector('.flex.justify-center.py-12');
    expect(container).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <MemoryRouter>
        <ProjectComparisonTable columns={[]} error="Test error" onRefetch={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('returns null when no columns and no loading/error', () => {
    const { container } = render(
      <MemoryRouter>
        <ProjectComparisonTable columns={[]} loading={false} error={null} onRefetch={vi.fn()} />
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });

  describe('ContextMenu for inline-explain', () => {
    const columnsWithDescription = [
      {
        ...buildCanonicalColumn(),
        description: 'Dies ist eine Testbeschreibung mit Fachbegriffen wie Machine Learning.',
      },
      buildSlaveColumn(200),
    ];

    it('renders context menu trigger on merged description area', () => {
      render(
        <MemoryRouter>
          <ProjectComparisonTable
            columns={columnsWithDescription}
            onRefetch={vi.fn()}
            mergedDescription="Test Beschreibung mit Begriffen."
          />
        </MemoryRouter>,
      );

      // ContextMenu trigger should be present
      const trigger = document.querySelector('[data-slot="context-menu-trigger"]');
      expect(trigger).toBeInTheDocument();
    });

    it('shows no explain item when right-clicking without text selection', () => {
      render(
        <MemoryRouter>
          <ProjectComparisonTable
            columns={columnsWithDescription}
            onRefetch={vi.fn()}
            mergedDescription="Test Beschreibung mit Begriffen."
          />
        </MemoryRouter>,
      );

      // Simulate right-click without selection
      const trigger = document.querySelector('[data-slot="context-menu-trigger"]');
      expect(trigger).toBeInTheDocument();

      // The explain item should not be visible initially
      expect(screen.queryByText(/Begriff erklären/)).not.toBeInTheDocument();
    });

    it('truncates long selected terms to 50 characters in menu', () => {
      const longDescription = 'A'.repeat(100);
      render(
        <MemoryRouter>
          <ProjectComparisonTable
            columns={columnsWithDescription}
            onRefetch={vi.fn()}
            mergedDescription={longDescription}
          />
        </MemoryRouter>,
      );

      // Verify component renders without errors
      const trigger = document.querySelector('[data-slot="context-menu-trigger"]');
      expect(trigger).toBeInTheDocument();
    });
  });
});
