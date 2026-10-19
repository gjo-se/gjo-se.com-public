/**
 * ScopeCell – Multi-select entity-type picker for CoreTag.scope / CoreStatus.scope.
 *
 * Uses the project's Combobox component family (ComboboxChips, ComboboxChip,
 * ComboboxChipsInput, ComboboxContent, ComboboxItem, etc.) from @base-ui/react
 * in multiple mode. Options are fetched from /admin/tagging/taggable-types
 * or /admin/status/statusable-types (context-specific base).
 */

import { useCallback, useEffect, useState } from 'react';

import Combobox from '@src/components/primitives/Combobox/Combobox';
import ComboboxChip from '@src/components/primitives/Combobox/ComboboxChip';
import ComboboxChips from '@src/components/primitives/Combobox/ComboboxChips';
import ComboboxChipsInput from '@src/components/primitives/Combobox/ComboboxChipsInput';
import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';
import ComboboxTrigger from '@src/components/primitives/Combobox/ComboboxTrigger';
import ComboboxValue from '@src/components/primitives/Combobox/ComboboxValue';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import api from '@src/lib/api/axios';

interface ScopeCellProps {
  value: string[];
  onSave: (next: string[]) => Promise<void>;
  typeKind: TypeKind;
}

type TypeKind = 'taggable' | 'statusable';

/**
 *
 */
export default function ScopeCell({ value, onSave, typeKind }: ScopeCellProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  // Fetch available entity types
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const suffix = typeKind === 'taggable' ? 'taggable-types' : 'statusable-types';
        const base = typeKind === 'taggable' ? '/admin/tagging' : '/admin/status';
        const { data } = await api.get<string[]>(`${base}/${suffix}`);
        if (!cancelled) setOptions(data);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [typeKind]);

  const filtered = options.filter((o) =>
    !query || o.toLowerCase().includes(query.toLowerCase()),
  );

  const handleValueChange = useCallback(async (next: string[]) => {
    await onSave(next);
  }, [onSave]);

  return (
    <Combobox<string, true>
      multiple
      value={value}
      onValueChange={handleValueChange}
    >
      <ComboboxTrigger>
        <ComboboxChips>
          {value.map((v) => (
            <ComboboxChip key={v}>
              {v}
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder={value.length === 0 ? (typeKind === 'taggable' ? 'Entity-Typen…' : 'Entity-Typen…') : ''}
          />
        </ComboboxChips>
        <ComboboxValue className="sr-only" />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxList>
          {loading && (
            <div className="flex justify-center py-2">
              <Spinner />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <ComboboxEmpty>
              <Text size="sm" color="muted">Keine Typen</Text>
            </ComboboxEmpty>
          )}
          {filtered.map((opt) => (
            <ComboboxItem key={opt} value={opt}>
              {opt}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
