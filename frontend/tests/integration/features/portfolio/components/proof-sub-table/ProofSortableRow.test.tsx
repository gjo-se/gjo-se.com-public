import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ProofSortableRow from '@src/features/portfolio/components/proof-sub-table/ProofSortableRow';

import { renderSortableRow } from '../../../integrationTestUtils';

import type { components } from '@src/lib/types.generated';

type ProofAdminOut = components['schemas']['ProofAdminOut'];

const PROOF: ProofAdminOut = {
  id: 1,
  image_src: null,
  sort: 0,
  priority: 'medium',
  questions: { de: 'Vertrauensfrage DE' },
  statements: { de: 'Statement DE', en: 'Statement EN' },
};

/** Renders the row with inert handlers. */
function renderRow(overrides: Partial<Parameters<typeof ProofSortableRow>[0]> = {}) {
  return renderSortableRow(PROOF.id, (
    <ProofSortableRow
      proof={PROOF}
      locale="de"
      uploadPrefix="portfolio/fixture-project"
      onDelete={vi.fn()}
      onInlineEdit={vi.fn(async () => null)}
      onStatementSave={vi.fn(async () => null)}
      onQuestionSave={vi.fn(async () => null)}
      {...overrides}
    />
  ));
}

describe('ProofSortableRow', () => {
  it('renders the localized question and statement of the active locale', () => {
    renderRow();

    expect(screen.getByText('Vertrauensfrage DE')).toBeInTheDocument();
    expect(screen.getByText('Statement DE')).toBeInTheDocument();
    expect(screen.queryByText('Statement EN')).not.toBeInTheDocument();
  });

  it('saves an edited statement for the proof', async () => {
    const onStatementSave = vi.fn(async () => null);
    renderRow({ onStatementSave });

    await userEvent.click(screen.getByText('Statement DE'));
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Neues Statement');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    expect(onStatementSave).toHaveBeenCalledWith(PROOF, 'Neues Statement');
  });

  it('saves the priority from the inline select', async () => {
    const onInlineEdit = vi.fn(async () => null);
    renderRow({ onInlineEdit });

    await userEvent.click(screen.getByText('Medium'));
    await userEvent.selectOptions(screen.getByLabelText('Priorität'), 'high');

    expect(onInlineEdit).toHaveBeenCalledWith(1, 'priority', 'high');
  });

  it('deletes the proof via the row action', async () => {
    const onDelete = vi.fn();
    renderRow({ onDelete });

    await userEvent.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('persists an edited image path as an inline edit', async () => {
    const onInlineEdit = vi.fn(async () => null);
    renderRow({ onInlineEdit });

    await userEvent.click(screen.getByText('–'));
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'portfolio/neu.webp');
    await userEvent.keyboard('{Enter}');

    expect(onInlineEdit).toHaveBeenCalledWith(1, 'image_src', 'portfolio/neu.webp');
  });
});
