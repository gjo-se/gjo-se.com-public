import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ExperienceSortableRow from '@src/features/application-profile/components/experience-table/ExperienceSortableRow';

import { renderSortableRow } from '../../../integrationTestUtils';

import type { ExperienceOut } from '@src/lib/api/applicationProfile';

const EXPERIENCE: ExperienceOut = {
  id: 1,
  applicationProfileId: 1,
  position: 'Senior Developer',
  company: 'Example GmbH',
  projectUrl: null,
  startDate: '2024-03-01',
  endDate: null,
  sort: 0,
  status: null,
  status_color_token: null,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
  translations: { de: { context: 'Kontext DE' } },
  decisions: [],
  proofs: [],
};

describe('ExperienceSortableRow', () => {
  it('renders role, period, context and company', () => {
    renderSortableRow(EXPERIENCE.id, (
      <ExperienceSortableRow
        row={EXPERIENCE}
        onEdit={vi.fn()}
        onDelete={vi.fn(async () => undefined)}
      />
    ));

    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('03/2024 – heute')).toBeInTheDocument();
    expect(screen.getByText('Kontext DE')).toBeInTheDocument();
    expect(screen.getByText('Example GmbH')).toBeInTheDocument();
  });

  it('renders a fallback for a missing context and company', () => {
    renderSortableRow(EXPERIENCE.id, (
      <ExperienceSortableRow
        row={{ ...EXPERIENCE, company: null, translations: {} }}
        onEdit={vi.fn()}
        onDelete={vi.fn(async () => undefined)}
      />
    ));

    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('opens the edit overlay for the row', () => {
    const onEdit = vi.fn();
    renderSortableRow(EXPERIENCE.id, (
      <ExperienceSortableRow
        row={EXPERIENCE}
        onEdit={onEdit}
        onDelete={vi.fn(async () => undefined)}
      />
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));

    expect(onEdit).toHaveBeenCalledWith(EXPERIENCE);
  });

  it('deletes the row after confirmation', async () => {
    const onDelete = vi.fn(async () => undefined);
    renderSortableRow(EXPERIENCE.id, (
      <ExperienceSortableRow row={EXPERIENCE} onEdit={vi.fn()} onDelete={onDelete} />
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Projekt wirklich löschen?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
