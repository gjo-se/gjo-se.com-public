import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProofSortableRow from '@src/features/application-profile/components/experience-dialog/ProofSortableRow';

import { renderSortableRow } from '../../../integrationTestUtils';

import type { ProofRow } from '@src/features/application-profile/components/experience-dialog/ProofSubTable';

const ROW: ProofRow = {
  key: 'proof-1',
  translations: {
    de: { text: 'Beleg DE' },
    en: { text: 'Beleg EN' },
  },
};

describe('ProofSortableRow', () => {
  it('renders the text of the active locale', () => {
    renderSortableRow(ROW.key, (
      <ProofSortableRow row={ROW} locale="de" onFieldChange={vi.fn()} onDelete={vi.fn()} />
    ));

    expect(screen.getByText('Beleg DE')).toBeInTheDocument();
    expect(screen.queryByText('Beleg EN')).not.toBeInTheDocument();
  });

  it('saves an edited proof text', () => {
    const onFieldChange = vi.fn();
    renderSortableRow(ROW.key, (
      <ProofSortableRow
        row={ROW}
        locale="de"
        onFieldChange={onFieldChange}
        onDelete={vi.fn()}
      />
    ));

    fireEvent.click(screen.getByText('Beleg DE'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Neuer Beleg' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', metaKey: true });

    expect(onFieldChange).toHaveBeenCalledWith('proof-1', 'Neuer Beleg');
  });

  it('deletes the proof after confirmation', async () => {
    const onDelete = vi.fn();
    renderSortableRow(ROW.key, (
      <ProofSortableRow row={ROW} locale="de" onFieldChange={vi.fn()} onDelete={onDelete} />
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Proof wirklich löschen?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(onDelete).toHaveBeenCalledWith('proof-1');
  });
});
