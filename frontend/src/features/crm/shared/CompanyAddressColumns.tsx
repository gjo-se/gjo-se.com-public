/**
 * CompanyAddressColumns – Column definitions for the company address table.
 *
 * Inline-edit columns (ClickToEditCell) for the address ghost row + inline-edit
 * table on the CompanyDetailPage. Each save persists via the CRM address API and
 * triggers the provided reload callback.
 */

import ClickToEditCell from '@src/components/molecules/ClickToEditCell/ClickToEditCell';
import Checkbox from '@src/components/primitives/Checkbox';
import type { TableColumnProps } from '@src/components/table';
import { updateAddress } from '@src/lib/api/crm';
import type { components } from '@src/lib/types.generated';

type CrmAddress = components['schemas']['AddressOut'];

/** Builds the address table columns bound to a company and a reload callback. */
export function createCompanyAddressColumns(
  companyId: number,
  reload: () => void,
): Record<string, TableColumnProps> {
  const makeSave = (addrId: number, field: string) =>
    async (value: string) => {
      await updateAddress(companyId, addrId, { [field]: value || null });
      reload();
    };

  const toAddress = (row: Record<string, unknown>): CrmAddress => row as unknown as CrmAddress;

  return {
    street: {
      label: 'Straße',
      renderCell: (row) => {
        const addr = toAddress(row);
        return <ClickToEditCell value={addr.street ?? null} onSave={makeSave(addr.id, 'street')} />;
      },
      ghostInput: 'text',
    },
    zip: {
      label: 'PLZ',
      width: '90px',
      renderCell: (row) => {
        const addr = toAddress(row);
        return <ClickToEditCell value={addr.zip ?? null} onSave={makeSave(addr.id, 'zip')} />;
      },
      ghostInput: 'text',
      ghostPlaceholder: 'PLZ',
    },
    city: {
      label: 'Stadt',
      renderCell: (row) => {
        const addr = toAddress(row);
        return <ClickToEditCell value={addr.city ?? null} onSave={makeSave(addr.id, 'city')} />;
      },
      ghostInput: 'text',
    },
    country: {
      label: 'Land',
      renderCell: (row) => {
        const addr = toAddress(row);
        return <ClickToEditCell value={addr.country ?? null} onSave={makeSave(addr.id, 'country')} />;
      },
      ghostInput: 'text',
    },
    label: {
      label: 'Label',
      renderCell: (row) => {
        const addr = toAddress(row);
        return <ClickToEditCell value={addr.label ?? null} onSave={makeSave(addr.id, 'label')} />;
      },
      ghostInput: 'text',
      ghostPlaceholder: 'z.\u202FB. HQ',
    },
    is_primary: {
      label: 'Primär',
      width: '80px',
      alignment: 'center',
      ghostInput: 'checkbox',
      ghostDefault: false,
      renderCell: (row: Record<string, unknown>) => {
        const addr = toAddress(row);
        return (
          <Checkbox
            checked={addr.is_primary}
            onChange={async (checked) => {
              await updateAddress(companyId, addr.id, { is_primary: checked });
              reload();
            }}
          />
        );
      },
    },
  };
}
