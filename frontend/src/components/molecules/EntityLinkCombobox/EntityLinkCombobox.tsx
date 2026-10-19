/**
 * EntityLinkCombobox – Generic reusable linking combobox.
 *
 * Searches entities via a debounced API call, shows results in a dropdown,
 * links entities with optional confirmation dialog, and displays existing
 * linked items as inline badges with unlink support.
 */
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import ConfirmDialog from '@src/components/molecules/ConfirmDialog/ConfirmDialog';
import Button from '@src/components/primitives/Button';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';
import Text from '@src/components/primitives/Text';

import { entityLinkBadgeVariants } from './EntityLinkCombobox.variants';

import type { ConfirmVariant } from './EntityLinkCombobox.types';

export interface EntityLinkComboboxProps<T> {
  placeholder: string;
  emptyText: string;
  /** Search function: query → items. Called after 300ms debounce. */
  onSearch: (query: string) => Promise<T[]>;
  /** Link function: item → void. 409 → toast with backend message. */
  onLink: (item: T) => Promise<void>;
  /** Render a single item in the dropdown list. */
  renderItem: (item: T) => React.ReactNode;
  /** Extract a unique string value from an item (used as Combobox value). */
  getItemValue: (item: T) => string;
  /** Existing linked items shown as inline badges with × unlink. */
  linkedItems?: LinkedItem[];
  /** Confirmation mode: 'dialog' (default) shows a Dialog, 'instant' links immediately. */
  confirmVariant?: ConfirmVariant;
  /** Dialog title (only for confirmVariant='dialog'). Default: "Sicherheitsabfrage". */
  confirmTitle?: string;
  /** Confirmation message (only for confirmVariant='dialog'). */
  confirmMessage?: (item: T) => string;
  /** Called after a successful link (e.g., to refetch data). */
  onLinked?: () => void;
}

/** A single linked item displayed as a badge above the search input. */
export interface LinkedItem {
  /** Unique key for React. */
  id: string;
  /** Render content of the badge (e.g. link + text). */
  label: React.ReactNode;
  /** Called when the user clicks the × unlink button. */
  onUnlink: () => void;
}

/**
 * Generic combobox for linking entities with inline badge display for existing links.
 *
 * @example Instant variant with linked items:
 * ```tsx
 * <EntityLinkCombobox
 *   confirmVariant="instant"
 *   placeholder="Firma suchen…"
 *   emptyText="Keine Firmen gefunden"
 *   onSearch={(q) => fetchCompanies({ q, limit: 7 })}
 *   onLink={(c) => linkPersonToCompany(personId, c.id)}
 *   renderItem={(c) => <>{c.name} – {c.primary_city}</>}
 *   getItemValue={(c) => String(c.id)}
 *   linkedItems={links.map(l => ({
 *     id: String(l.id),
 *     label: <Link to={...}>Company #{l.crm_company_id}</Link>,
 *     onUnlink: () => unlinkCompany(personId, l.id).then(reload),
 *   }))}
 *   onLinked={() => reload()}
 * />
 * ```
 */
export default function EntityLinkCombobox<T>({
  placeholder,
  emptyText,
  onSearch,
  onLink,
  renderItem,
  getItemValue,
  linkedItems,
  confirmVariant = 'dialog',
  confirmTitle = 'Sicherheitsabfrage',
  confirmMessage,
  onLinked,
}: EntityLinkComboboxProps<T>) {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<T | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isDialog = confirmVariant === 'dialog';

  // ── Search ─────────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    (val: string) => {
      setSearchQuery(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!val.trim()) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(() => {
        setLoading(true);
        onSearch(val.trim())
          .then((items) => setResults(items))
          .catch(() => toast.error('Suche fehlgeschlagen.'))
          .finally(() => setLoading(false));
      }, 300);
    },
    [onSearch],
  );

  // ── Execute link ───────────────────────────────────────────────────────

  const executeLink = useCallback(async (item: T) => {
    try {
      await onLink(item);
      toast.success('Verknüpft.');
      onLinked?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Verknüpfen.';
      toast.error(msg);
    }
    setValue('');
  }, [onLink, onLinked]);

  // ── Select ─────────────────────────────────────────────────────────────

  const handleValueChange = useCallback(
    (newValue: string) => {
      if (!newValue) return;
      setValue(newValue);
      setSearchQuery('');
      const target = results.find((item) => getItemValue(item) === newValue);
      if (!target) return;
      if (isDialog) {
        setConfirmTarget(target);
      } else {
        void executeLink(target);
      }
    },
    [results, getItemValue, isDialog, executeLink],
  );

  // ── Dialog: confirm / cancel ───────────────────────────────────────────

  const handleCancel = useCallback(() => {
    setConfirmTarget(null);
    setValue('');
  }, []);

  const handleConfirm = useCallback(() => {
    if (!confirmTarget) return;
    const item = confirmTarget;
    setConfirmTarget(null);
    void executeLink(item);
  }, [confirmTarget, executeLink]);

  // ── Render ─────────────────────────────────────────────────────────────

  const showEmpty = results.length === 0 && searchQuery.trim() && !loading;
  const hasLinks = linkedItems && linkedItems.length > 0;

  return (
    <>
      {/* Linked items as inline badges */}
      {hasLinks && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {linkedItems!.map((li) => (
            <div
              key={li.id}
              className={entityLinkBadgeVariants()}
            >
              <Text as="span" size="xs">{li.label}</Text>
              <Button
                type="button"
                variant="badge-remove"
                onClick={li.onUnlink}
                title="Verknüpfung lösen"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      <Combobox {...({ value, onValueChange: handleValueChange } as Record<string, unknown>)}>
        <ComboboxInput
          placeholder={hasLinks ? 'Weitere hinzufügen…' : placeholder}
          value={searchQuery}
          onChange={(e) => handleSearch((e.target as HTMLInputElement).value)}
        />
        <ComboboxContent>
          <ComboboxList>
            {results.map((item) => (
              <ComboboxItem
                key={getItemValue(item)}
                {...({ value: getItemValue(item) } as Record<string, unknown>)}
              >
                {renderItem(item)}
              </ComboboxItem>
            ))}
          </ComboboxList>
          {showEmpty && <ComboboxEmpty>{emptyText}</ComboboxEmpty>}
          {loading && <ComboboxEmpty>Suche…</ComboboxEmpty>}
        </ComboboxContent>
      </Combobox>

      {isDialog && (
        <ConfirmDialog
          open={confirmTarget !== null}
          title={confirmTitle}
          description={confirmTarget && confirmMessage ? confirmMessage(confirmTarget) : ''}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}

export type { EntityLinkComboboxVariants } from './EntityLinkCombobox.variants';
export type { ConfirmVariant } from './EntityLinkCombobox.types';
