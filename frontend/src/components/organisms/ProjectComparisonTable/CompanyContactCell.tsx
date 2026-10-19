import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import Combobox from '@src/components/primitives/Combobox';
import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import { fetchAddresses, fetchCompanies, updatePerson } from '@src/lib/api/crm';
import { routeConfig } from '@src/router.config';

import { companyContactCellVariants } from './CompanyContactCell.variants';

import type { CrmCompany } from './CompanyContactCell.types';

export interface CompanyContactCellProps {
  /** Linked CRM person whose company is changed; null = no company editable. */
  personId: number | null;
  /** Linked CRM company id (via person → address → company), if any. */
  companyId: number | null;
  /** Linked CRM company name, if any. */
  companyName: string | null;
  /** Raw project company name shown when no CRM company is linked. */
  fallbackName: string;
  /** Called after a successful change so the table reloads its data. */
  onRefetch: () => void;
}

export type { CompanyContactCellVariants } from './CompanyContactCell.variants';

/**
 * CompanyContactCell – the master's company (Agentur) with an inline picker.
 *
 * The company hangs off the linked CRM person (person → address → company), so
 * changing it re-points the person's address to the chosen company's primary
 * address – exactly like the company picker on the person detail page. Without
 * a linked person there is nothing to re-point; the cell stays read-only then.
 */
export default function CompanyContactCell({
  personId,
  companyId,
  companyName,
  fallbackName,
  onRefetch,
}: CompanyContactCellProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CrmCompany[]>([]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchCompanies({ q: value.trim(), limit: 7 })
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
  }, []);

  const changeCompany = useCallback(
    async (company: CrmCompany) => {
      if (personId == null) return;
      setSaving(true);
      try {
        const addresses = await fetchAddresses(company.id);
        const primary = addresses.find((a) => a.is_primary) ?? addresses[0];
        if (!primary) {
          toast.error('Diese Firma hat keine Adresse – bitte zuerst eine anlegen.');
          return;
        }
        await updatePerson(personId, { address_id: primary.id });
        setQuery('');
        setResults([]);
        toast.success('Firma geändert.');
        onRefetch();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Firma ändern fehlgeschlagen.');
      } finally {
        setSaving(false);
      }
    },
    [personId, onRefetch],
  );

  const displayName = companyName ?? fallbackName;

  return (
    <div className={companyContactCellVariants()}>
      {companyId != null ? (
        <Link
          to={routeConfig.adminCrmCompanyDetail.path.replace(':id', String(companyId))}
          size="sm"
        >
          {displayName}
        </Link>
      ) : (
        <Text as="span" size="sm">{displayName}</Text>
      )}

      {personId != null && (
        <Combobox>
          <ComboboxInput
            aria-label="Firma ändern"
            placeholder="Firma ändern…"
            value={query}
            disabled={saving}
            onChange={(e) => search((e.target as HTMLInputElement).value)}
          />
          <ComboboxContent>
            <ComboboxList>
              {results.map((c) => (
                <ComboboxItem
                  key={c.id}
                  {...({ value: String(c.id) } as Record<string, unknown>)}
                  onClick={() => void changeCompany(c)}
                >
                  {c.name}
                  {c.primary_city ? ` – ${c.primary_city}` : ''}
                </ComboboxItem>
              ))}
            </ComboboxList>
            {results.length === 0 && query.trim() !== '' && (
              <ComboboxEmpty>Keine Firmen gefunden</ComboboxEmpty>
            )}
          </ComboboxContent>
        </Combobox>
      )}
    </div>
  );
}
