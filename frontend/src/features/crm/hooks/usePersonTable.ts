/**
 * usePersonTable – Server-side data hook for the CRM Persons table.
 *
 * Dünner Wrapper um den generischen `useEntityTable` (URL-synced Paging/Sort,
 * Ghost-Row-Create, Delete, Edit-Navigation, Status-Filter).
 */
import { useEntityTable, type UseEntityTableResult } from '@src/components/table/useEntityTable';
import { createPerson, deletePerson, fetchPersonCount, fetchPersons } from '@src/lib/api/crm';
import type { components } from '@src/lib/types.generated';
import { routeConfig } from '@src/router.config';

import { createPersonColumns } from '../shared/PersonColumns';

type CrmPersonOut = components['schemas']['PersonOut'];

// ── Constants ────────────────────────────────────────────────────────────

const TABLE_KEY = 'admin-persons';

/** Frontend column key → backend sort field mapping. */
const SORT_FIELD_MAP: Record<string, string> = {
  id: 'id',
  first_name: 'first_name',
  last_name: 'last_name',
  primary_company_name: 'company_name',
  email: 'email',
  phone: 'phone',
};

// ── Types ────────────────────────────────────────────────────────────────

/** Row type for the persons table – direct alias of the backend schema. */
export type PersonTableRow = CrmPersonOut;

export type UsePersonTableResult = UseEntityTableResult<PersonTableRow>;

// ── Hook ─────────────────────────────────────────────────────────────────

/** Server-side data hook for CRM Persons table. */
export function usePersonTable(): UsePersonTableResult {
  return useEntityTable<PersonTableRow>({
    tableKey: TABLE_KEY,
    defaultSort: 'last_name',
    sortFieldMap: SORT_FIELD_MAP,
    fetchList: fetchPersons,
    fetchCount: fetchPersonCount,
    create: async (ghostData) => {
      const firstName = String(ghostData.first_name ?? '').trim() || undefined;
      const lastName = String(ghostData.last_name ?? '').trim() || undefined;
      if (!firstName && !lastName) throw new Error('Vor- oder Nachname ist erforderlich.');
      const email = String(ghostData.email ?? '').trim() || undefined;
      const created = await createPerson({
        first_name: firstName,
        last_name: lastName,
        email,
      } as components['schemas']['PersonCreate']);
      return created;
    },
    remove: (row) => deletePerson(row.id),
    buildColumns: createPersonColumns,
    status: { statusableType: 'crm_person', filterColumn: 'last_name' },
    detailPath: (row) => routeConfig.adminCrmPersonDetail.path.replace(':id', String(row.id)),
    deleteDisabled: (row) => row.has_dependents === true,
    deleteDisabledTitle: 'Person hat Abhängigkeiten (Projekt-Verknüpfungen)',
  });
}
