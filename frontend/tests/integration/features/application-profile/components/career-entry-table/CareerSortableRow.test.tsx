import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CareerSortableRow from '@src/features/application-profile/components/career-entry-table/CareerSortableRow';

import { renderSortableRow } from '../../../integrationTestUtils';

import type { CareerRow } from '@src/features/application-profile/hooks/useCareerEntryTable';

const ROW: CareerRow = {
  id: 1,
  position: 'Senior Developer',
  company: 'Example GmbH',
  project_url: null,
  start_date: '2024-01-01',
  end_date: null,
  description_de: null,
  description_en: null,
  status: null,
  status_color_token: null,
  translations: {},
};

describe('CareerSortableRow', () => {
  it('renders position, company and start date', () => {
    renderSortableRow(ROW.id, (
      <CareerSortableRow
        row={ROW}
        sortableEnabled
        onFieldSave={vi.fn()}
        onDelete={vi.fn(async () => undefined)}
      />
    ));

    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('Example GmbH')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '01.01.24' })).toBeInTheDocument();
  });

  it('saves an edited company through the inline cell', () => {
    const onFieldSave = vi.fn();
    renderSortableRow(ROW.id, (
      <CareerSortableRow
        row={ROW}
        sortableEnabled
        onFieldSave={onFieldSave}
        onDelete={vi.fn(async () => undefined)}
      />
    ));

    fireEvent.click(screen.getByText('Example GmbH'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Neue Firma' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    expect(onFieldSave).toHaveBeenCalledWith(ROW, 'company', 'Neue Firma');
  });

  it('deletes the row after confirmation', async () => {
    const onDelete = vi.fn(async () => undefined);
    renderSortableRow(ROW.id, (
      <CareerSortableRow
        row={ROW}
        sortableEnabled
        onFieldSave={vi.fn()}
        onDelete={onDelete}
      />
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('Karriere-Station wirklich löschen?'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(onDelete).toHaveBeenCalledWith(ROW);
  });
});
