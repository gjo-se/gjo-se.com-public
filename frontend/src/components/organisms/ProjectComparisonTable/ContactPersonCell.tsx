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
import {
  createProjectCrmPerson,
  deleteProjectCrmPerson,
  fetchPersons,
} from '@src/lib/api/crm';
import { routeConfig } from '@src/router.config';

import { contactPersonCellVariants } from './ContactPersonCell.variants';

import type { CrmPerson } from './ContactPersonCell.types';

export interface ContactPersonCellProps {
  /** Canonical project whose contact person is changed. */
  projectId: number;
  /** Id of the currently linked project↔person link, if any. */
  linkId: number | null;
  /** Id of the currently linked CRM person, if any. */
  personId: number | null;
  /** Linked CRM person's display name, if any. */
  personName: string | null;
  /** Raw project contact name shown when no CRM person is linked. */
  fallbackName: string;
  /** Called after a successful change so the table reloads its data. */
  onRefetch: () => void;
}

export type { ContactPersonCellVariants } from './ContactPersonCell.variants';

/**
 * ContactPersonCell – the master's contact (Kontakt) with an inline picker.
 *
 * Selecting another person replaces the project's current primary link: the old
 * link is removed and the chosen person is linked as the new primary contact.
 */
export default function ContactPersonCell({
  projectId,
  linkId,
  personId,
  personName,
  fallbackName,
  onRefetch,
}: ContactPersonCellProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CrmPerson[]>([]);
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
      fetchPersons({ q: value.trim(), limit: 7 })
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
  }, []);

  const changePerson = useCallback(
    async (person: CrmPerson) => {
      if (person.id === personId) return;
      setSaving(true);
      try {
        if (linkId != null) await deleteProjectCrmPerson(linkId);
        try {
          await createProjectCrmPerson({
            project_id: projectId,
            crm_person_id: person.id,
            label: 'primary',
          });
        } catch (err: unknown) {
          // 409 = the target person is already linked; the old link is gone, so
          // the project now points at the chosen person either way.
          const message = err instanceof Error ? err.message : '';
          if (!message.startsWith('409')) throw err;
        }
        setQuery('');
        setResults([]);
        toast.success('Kontakt geändert.');
        onRefetch();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Kontakt ändern fehlgeschlagen.');
      } finally {
        setSaving(false);
      }
    },
    [personId, linkId, projectId, onRefetch],
  );

  const displayName = personName ?? fallbackName;

  return (
    <div className={contactPersonCellVariants()}>
      {personId != null ? (
        <Link
          to={routeConfig.adminCrmPersonDetail.path.replace(':id', String(personId))}
          size="sm"
        >
          {displayName}
        </Link>
      ) : (
        <Text as="span" size="sm">{displayName}</Text>
      )}

      <Combobox>
        <ComboboxInput
          aria-label="Kontakt ändern"
          placeholder="Kontakt ändern…"
          value={query}
          disabled={saving}
          onChange={(e) => search((e.target as HTMLInputElement).value)}
        />
        <ComboboxContent>
          <ComboboxList>
            {results.map((p) => (
              <ComboboxItem
                key={p.id}
                {...({ value: String(p.id) } as Record<string, unknown>)}
                onClick={() => void changePerson(p)}
              >
                {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '\u2013'}
                {p.primary_company_name ? ` – ${p.primary_company_name}` : ''}
              </ComboboxItem>
            ))}
          </ComboboxList>
          {results.length === 0 && query.trim() !== '' && (
            <ComboboxEmpty>Keine Personen gefunden</ComboboxEmpty>
          )}
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
