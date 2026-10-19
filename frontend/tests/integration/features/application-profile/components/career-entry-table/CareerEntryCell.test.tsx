import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CareerEntryCell from '@src/features/application-profile/components/career-entry-table/CareerEntryCell';

import { renderInTable } from '../../../integrationTestUtils';

import type { CareerRow } from '@src/features/application-profile/hooks/useCareerEntryTable';

const ROW: CareerRow = {
  id: 1,
  position: 'Senior Developer',
  company: 'Example GmbH',
  project_url: 'https://example.com/projekt',
  start_date: '2024-01-01',
  end_date: null,
  description_de: 'Beschreibung DE',
  description_en: 'Description EN',
  status: 'active',
  status_color_token: 'green',
  translations: { de: { description: 'Beschreibung DE' } },
};

describe('CareerEntryCell', () => {
  it('renders the position of the row', () => {
    renderInTable(
      <tr>
        <td><CareerEntryCell row={ROW} colKey="position" onFieldSave={vi.fn()} /></td>
      </tr>,
    );

    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
  });

  it('saves an edited position', () => {
    const onFieldSave = vi.fn();
    renderInTable(
      <tr>
        <td><CareerEntryCell row={ROW} colKey="position" onFieldSave={onFieldSave} /></td>
      </tr>,
    );

    fireEvent.click(screen.getByText('Senior Developer'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Lead Developer' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    expect(onFieldSave).toHaveBeenCalledWith(ROW, 'position', 'Lead Developer');
  });

  it('renders the German date in the date cell', () => {
    renderInTable(
      <tr>
        <td><CareerEntryCell row={ROW} colKey="start_date" onFieldSave={vi.fn()} /></td>
      </tr>,
    );

    expect(screen.getByRole('button', { name: '01.01.24' })).toBeInTheDocument();
  });

  it('saves an edited description through the textarea', () => {
    const onFieldSave = vi.fn();
    renderInTable(
      <tr>
        <td><CareerEntryCell row={ROW} colKey="description_de" onFieldSave={onFieldSave} /></td>
      </tr>,
    );

    fireEvent.click(screen.getByText('Beschreibung DE'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Neue Beschreibung' } });
    fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Enter',
      ctrlKey: true,
    });

    expect(onFieldSave).toHaveBeenCalledWith(ROW, 'description_de', 'Neue Beschreibung');
  });
});
