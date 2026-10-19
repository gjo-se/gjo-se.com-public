import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillGroupSortableRow from '@src/features/fbf/skill/components/skill-group-admin-tab/SkillGroupSortableRow';

import type { SkillGroupAdminRow } from '@src/features/fbf/skill/utils/skillGroupAdminTypes';

/** Builds a skill-group admin row with sane defaults. */
function makeRow(overrides: Partial<SkillGroupAdminRow> = {}): SkillGroupAdminRow {
  return {
    id: 1,
    sort: 1,
    priority: 'medium',
    label_de: 'Backend',
    label_en: 'Backend EN',
    skillCount: 0,
    ...overrides,
  };
}

/** Renders the sortable `<tr>` inside a minimal sortable table. */
function renderRow(
  row: SkillGroupAdminRow,
  handlers: Partial<{
    onDelete: (id: number) => void
    onSort: (row: SkillGroupAdminRow) => void
  }> = {},
) {
  return render(
    <DndContext>
      <SortableContext items={[row.id]}>
        <table>
          <tbody>
            <SkillGroupSortableRow
              row={row}
              onDelete={handlers.onDelete ?? (() => undefined)}
              onLabelSave={() => undefined}
              onPriorityChange={() => undefined}
              onSort={handlers.onSort ?? (() => undefined)}
            />
          </tbody>
        </table>
      </SortableContext>
    </DndContext>,
  );
}

describe('SkillGroupSortableRow', () => {
  it('renders both labels and the priority', () => {
    renderRow(makeRow());

    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Backend EN')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('notifies the parent when sorting skills', async () => {
    const onSort = vi.fn();
    const row = makeRow();
    renderRow(row, { onSort });

    await userEvent.click(screen.getByRole('button', { name: 'Skills sortieren' }));

    expect(onSort).toHaveBeenCalledWith(row);
  });

  it('deletes an empty group', async () => {
    const onDelete = vi.fn();
    renderRow(makeRow(), { onDelete });

    await userEvent.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('disables deletion for a group that still contains skills', () => {
    renderRow(makeRow({ skillCount: 2 }));

    expect(
      screen.getByRole('button', { name: 'Löschen nicht möglich' }),
    ).toBeDisabled();
  });
});
