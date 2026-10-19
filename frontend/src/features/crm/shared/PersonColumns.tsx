/**
 * PersonColumns – Column definitions for the CRM Persons table.
 *
 * Columns: ID, First Name, Last Name, Company (name - city, link to company detail),
 * Email, Phone – all sortable server-side.
 */

import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import type { TableColumnProps } from '@src/components/table';
import type { components } from '@src/lib/types.generated';
import { routeConfig } from '@src/router.config';

import { renderTagsCell } from './RenderTagsCell';

import type { ReactNode } from 'react';


type CrmPersonOut = components['schemas']['PersonOut'];

/** Column definitions: ID, First Name, Last Name, Company, Email, Phone. */
export function createPersonColumns(): Record<string, TableColumnProps> {
  const renderCompanyCell = (row: Record<string, unknown>): ReactNode => {
    const r = row as unknown as CrmPersonOut;
    const companyId = r.primary_company_id;
    const companyName = r.primary_company_name;
    const companyCity = r.primary_company_city;
    if (!companyId || !companyName) return <Text size="sm" color="muted">–</Text>;
    const label = companyCity ? `${companyName} – ${companyCity}` : companyName;
    const detailPath = routeConfig.adminCrmCompanyDetail.path.replace(':id', String(companyId));
    return (
      <Link to={detailPath}>
        {label}
      </Link>
    );
  };

  return {
    id: {
      label: 'ID',
      width: '70px',
      sortable: true,
      alignment: 'left',
    },
    first_name: {
      label: 'First Name',
      search: true,
      sortable: true,
      defaultSort: 'asc',
      ghostInput: 'text',
      ghostPlaceholder: 'Vorname',
    },
    last_name: {
      label: 'Last Name',
      search: true,
      sortable: true,
      ghostInput: 'text',
      ghostPlaceholder: 'Nachname',
    },
    primary_company_name: {
      label: 'Company',
      search: true,
      sortable: true,
      sortField: 'primary_company_name',
      renderCell: renderCompanyCell,
    },
    email: {
      label: 'E-Mail',
      sortable: true,
    },
    phone: {
      label: 'Phone',
      sortable: true,
    },
    tags: {
      label: 'Tags',
      width: '200px',
      renderCell: renderTagsCell,
    },
  };
}
