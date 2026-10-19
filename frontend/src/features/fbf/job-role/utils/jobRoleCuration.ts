/**
 * useJobRoleCuration.logic – Pure row builders for the job role curation table.
 *
 * Maps API job roles to table rows. The ``active`` field drives the row-action
 * confirmed-toggle icon (green check = confirmed). The ``reassign`` cell
 * renders the per-row target combobox.
 */

import { createElement } from 'react';

import { type DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';

import ReassignCell from '../components/curation/ReassignCell';
import { type JobRoleAdminOut } from '../services/curation';

import type { ReactNode } from 'react';

export interface JobRoleCurationRow {
  id: number
  name: string
  project_count: number
  /** True = confirmed (drives the green confirmed-toggle icon). */
  active: boolean
  reassign: ReactNode
}

/** Maps API job roles to curation table rows with reassign dropdown. */
export function buildJobRoleRows(
  roles: JobRoleAdminOut[],
  confirmedRoles: JobRoleAdminOut[],
  onReassign: (roleId: number, targetId: number | null) => void,
): JobRoleCurationRow[] {
  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    project_count: role.project_count ?? 0,
    active: role.status === 'active',
    reassign: createElement(ReassignCell, {
      targetItems: buildTargetItems(confirmedRoles, role.id),
      onReassign: (targetId: number | null) => onReassign(role.id, targetId),
    }),
  }));
}

/** Builds reassign-target dropdown items (all confirmed roles except ``exceptId``). */
function buildTargetItems(confirmed: JobRoleAdminOut[], exceptId: number): DropdownItem[] {
  return [
    { value: '', label: '(keine – Verknüpfungen entfernen)' },
    ...confirmed.filter((r) => r.id !== exceptId).map((r) => ({ value: String(r.id), label: r.name })),
  ];
}
