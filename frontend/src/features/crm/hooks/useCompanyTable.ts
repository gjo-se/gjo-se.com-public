/**
 * useCompanyTable – Server-side data hook for the CRM Companies table.
 *
 * Dünner Wrapper um den generischen `useEntityTable` (URL-synced Paging/Sort,
 * Ghost-Row-Create, Delete, Edit-Navigation, Status-Filter).
 */
import { useEntityTable, type UseEntityTableResult } from '@src/components/table/useEntityTable';
import { createCompany, deleteCompany, fetchCompanies, fetchCompanyCount } from '@src/lib/api/crm';
import type { components } from '@src/lib/types.generated';
import { routeConfig } from '@src/router.config';

import { createCompanyColumns } from '../shared/CompanyColumns';

type CrmCompanyOut = components['schemas']['CompanyOut'];

// ── Constants ────────────────────────────────────────────────────────────

const TABLE_KEY = 'admin-companies';

/** Frontend column key → backend sort field mapping. */
const SORT_FIELD_MAP: Record<string, string> = {
  id: 'id',
  name: 'name',
  primary_city: 'city',
  primary_country: 'country',
  kununu_score: 'kununu_score',
};

// ── Types ────────────────────────────────────────────────────────────────

/** Row type for the companies table – direct alias of the backend schema. */
export type CompanyTableRow = CrmCompanyOut;

export type UseCompanyTableResult = UseEntityTableResult<CompanyTableRow>;

// ── Hook ─────────────────────────────────────────────────────────────────

/** Server-side data hook for CRM Companies table. */
export function useCompanyTable(): UseCompanyTableResult {
  return useEntityTable<CompanyTableRow>({
    tableKey: TABLE_KEY,
    defaultSort: 'name',
    sortFieldMap: SORT_FIELD_MAP,
    fetchList: fetchCompanies,
    fetchCount: fetchCompanyCount,
    create: async (ghostData) => {
      const name = String(ghostData.name ?? '').trim();
      if (!name) throw new Error('Name ist erforderlich.');
      return createCompany({ name });
    },
    remove: (row) => deleteCompany(row.id),
    buildColumns: createCompanyColumns,
    status: { statusableType: 'crm_company', filterColumn: 'name' },
    detailPath: (row) => routeConfig.adminCrmCompanyDetail.path.replace(':id', String(row.id)),
    deleteDisabled: (row) => row.has_dependents === true,
    deleteDisabledTitle: 'Firma hat Abhängigkeiten (Adressen / Personen)',
  });
}
