import Text from '@src/components/primitives/Text';

/** Sort direction for the observer ticket queue. */
export type SortDir = 'asc' | 'desc';

/** Sortable column field for the observer ticket queue. */
export type SortField = 'created_at' | 'severity' | 'task';

interface SortHeaderProps {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onClick: (field: SortField) => void;
}

/** Clickable table header that toggles the sort field/direction. */
export default function SortHeader({ field, label, current, dir, onClick }: SortHeaderProps) {
  const isActive = current === field;
  return (
    <th
      className="px-4 py-2 font-medium text-on-surface-secondary cursor-pointer select-none hover:text-on-surface"
      onClick={() => onClick(field)}
    >
      {label}
      {isActive && (
        <div className="ml-1">
          <Text as="span">{dir === 'asc' ? '▲' : '▼'}</Text>
        </div>
      )}
    </th>
  );
}
