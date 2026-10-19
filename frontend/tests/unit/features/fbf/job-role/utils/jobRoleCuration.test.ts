/**
 * Tests: buildJobRoleRows
 *
 * Behaviour: maps API roles to table rows (project count default 0, active
 * derived from status) and builds the reassign dropdown with "remove links"
 * first and all other confirmed roles except the row's own role.
 */
import { describe, expect, it, vi } from 'vitest';

import { buildJobRoleRows } from '@src/features/fbf/job-role/utils/jobRoleCuration';

import type { JobRoleAdminOut } from '@src/features/fbf/job-role/services/curation';
import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import type { ReactElement } from 'react';

const roles: JobRoleAdminOut[] = [
  { id: 1, name: 'Frontend', project_count: 3, status: 'active' },
  { id: 2, name: 'Backend', project_count: 0, status: 'pending' },
];

const confirmed: JobRoleAdminOut[] = [
  { id: 1, name: 'Frontend', project_count: 3, status: 'active' },
  { id: 2, name: 'Backend', project_count: 0, status: 'active' },
  { id: 3, name: 'DevOps', project_count: 1, status: 'active' },
];

interface ReassignProps {
  targetItems: DropdownItem[]
  onReassign: (targetId: number | null) => void
}

function reassignProps(row: { reassign: unknown }): ReassignProps {
  return (row.reassign as ReactElement<ReassignProps>).props;
}

describe('buildJobRoleRows', () => {
  it('bildet jede Rolle auf eine Tabellenzeile ab', () => {
    const rows = buildJobRoleRows(roles, confirmed, () => undefined);

    expect(rows.map((row) => ({ id: row.id, name: row.name }))).toEqual([
      { id: 1, name: 'Frontend' },
      { id: 2, name: 'Backend' },
    ]);
  });

  it('leitet active aus dem Status ab', () => {
    const rows = buildJobRoleRows(roles, confirmed, () => undefined);

    expect(rows.map((row) => row.active)).toEqual([true, false]);
  });

  it('baut die Ziel-Liste mit Entfernen-Option und ohne die eigene Rolle', () => {
    const rows = buildJobRoleRows(roles, confirmed, () => undefined);

    const items = reassignProps(rows[0]!).targetItems;

    expect(items).toEqual([
      { value: '', label: '(keine – Verknüpfungen entfernen)' },
      { value: '2', label: 'Backend' },
      { value: '3', label: 'DevOps' },
    ]);
  });

  it('meldet die Rollen-ID zusammen mit dem gewählten Ziel', () => {
    const onReassign = vi.fn();
    const rows = buildJobRoleRows(roles, confirmed, onReassign);

    reassignProps(rows[1]!).onReassign(3);

    expect(onReassign).toHaveBeenCalledWith(2, 3);
  });

  it('meldet null beim Entfernen der Verknüpfungen', () => {
    const onReassign = vi.fn();
    const rows = buildJobRoleRows(roles, confirmed, onReassign);

    reassignProps(rows[0]!).onReassign(null);

    expect(onReassign).toHaveBeenCalledWith(1, null);
  });

  it('liefert eine leere Liste ohne Rollen', () => {
    expect(buildJobRoleRows([], confirmed, () => undefined)).toEqual([]);
  });
});
