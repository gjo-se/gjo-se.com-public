/**
 * ContactEntityPicker – Presentational search picker for a CRM entity.
 *
 * Renders a combobox with search results and an optional "create new" action
 * when no match is found. Selection is delegated to the caller via `onSelect`
 * (no immediate linking, no API calls, no store access).
 */
import Button from '@src/components/primitives/Button';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';
import Text from '@src/components/primitives/Text';

export interface ContactEntityPickerProps<T> {
  label: string;
  placeholder: string;
  emptyText: string;
  query: string;
  onQueryChange: (value: string) => void;
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  createLabel?: string;
  onCreate?: () => void;
  selectedLabel?: string;
}

/** Generic combobox for picking a single CRM entity from search results. */
export default function ContactEntityPicker<T>({
  label,
  placeholder,
  emptyText,
  query,
  onQueryChange,
  items,
  getKey,
  renderItem,
  onSelect,
  createLabel,
  onCreate,
  selectedLabel,
}: ContactEntityPickerProps<T>) {
  const showEmpty = items.length === 0 && query.trim() !== '';

  return (
    <div className="flex flex-col gap-1.5">
      <Text as="span" size="sm" weight="medium" color="muted">
        {label}
      </Text>
      {selectedLabel && (
        <Text as="span" size="sm">
          {selectedLabel}
        </Text>
      )}
      <Combobox>
        <ComboboxInput
          placeholder={placeholder}
          value={query}
          onChange={(e) => onQueryChange((e.target as HTMLInputElement).value)}
        />
        <ComboboxContent>
          <ComboboxList>
            {items.map((item) => (
              <ComboboxItem
                key={getKey(item)}
                {...({ value: getKey(item) } as Record<string, unknown>)}
                onClick={() => onSelect(item)}
              >
                {renderItem(item)}
              </ComboboxItem>
            ))}
          </ComboboxList>
          {showEmpty && (
            <ComboboxEmpty>
              <div className="flex flex-col gap-1.5">
                <Text as="span" size="sm" color="muted">
                  {emptyText}
                </Text>
                {createLabel && onCreate && (
                  <Button variant="ghost" size="xs" onClick={onCreate}>
                    {createLabel}
                  </Button>
                )}
              </div>
            </ComboboxEmpty>
          )}
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
