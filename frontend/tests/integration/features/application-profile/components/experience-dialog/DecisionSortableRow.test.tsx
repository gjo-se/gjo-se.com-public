import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DecisionSortableRow from '@src/features/application-profile/components/experience-dialog/DecisionSortableRow';

import { renderSortableRow } from '../../../integrationTestUtils';

import type { DecisionRow } from '@src/features/application-profile/components/experience-dialog/DecisionSubTable';

const ROW: DecisionRow = {
  key: 'decision-1',
  translations: {
    de: { title: 'Titel DE', body: 'Inhalt DE', discarded: 'Verworfen DE' },
    en: { title: 'Title EN', body: 'Body EN', discarded: 'Discarded EN' },
  },
};

describe('DecisionSortableRow', () => {
  it('renders the fields of the active locale only', () => {
    renderSortableRow(ROW.key, (
      <DecisionSortableRow row={ROW} locale="de" onFieldChange={vi.fn()} onDelete={vi.fn()} />
    ));

    expect(screen.getByText('Titel DE')).toBeInTheDocument();
    expect(screen.getByText('Inhalt DE')).toBeInTheDocument();
    expect(screen.getByText('Verworfen DE')).toBeInTheDocument();
    expect(screen.queryByText('Title EN')).not.toBeInTheDocument();
  });

  it('saves an edited title', () => {
    const onFieldChange = vi.fn();
    renderSortableRow(ROW.key, (
      <DecisionSortableRow
        row={ROW}
        locale="de"
        onFieldChange={onFieldChange}
        onDelete={vi.fn()}
      />
    ));

    fireEvent.click(screen.getByText('Titel DE'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Neuer Titel' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    expect(onFieldChange).toHaveBeenCalledWith('decision-1', 'title', 'Neuer Titel');
  });

  it('saves an edited body through the textarea', () => {
    const onFieldChange = vi.fn();
    renderSortableRow(ROW.key, (
      <DecisionSortableRow
        row={ROW}
        locale="de"
        onFieldChange={onFieldChange}
        onDelete={vi.fn()}
      />
    ));

    fireEvent.click(screen.getByText('Inhalt DE'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Neuer Inhalt' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', metaKey: true });

    expect(onFieldChange).toHaveBeenCalledWith('decision-1', 'body', 'Neuer Inhalt');
  });

  it('deletes the decision after confirmation', async () => {
    const onDelete = vi.fn();
    renderSortableRow(ROW.key, (
      <DecisionSortableRow row={ROW} locale="de" onFieldChange={vi.fn()} onDelete={onDelete} />
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Entscheidung wirklich löschen?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(onDelete).toHaveBeenCalledWith('decision-1');
  });
});
