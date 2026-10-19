/**
 * AdrToolbar – Status-Filter-Dropdown fuer die ADR-Tabelle.
 *
 * Wird als `children` in die Table-Komponente eingehaengt und dort
 * neben dem Suchfeld gerendert. Der Filterwert wird via URL-Param
 * `status` persistiert (Bookmark-faehig).
 */

import { useSearchParams } from 'react-router';

import Dropdown from '@src/components/molecules/Dropdown/Dropdown';
import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';

const STATUS_OPTIONS: DropdownItem[] = [
  { value: '', label: 'All' },
  { value: 'proposed', label: 'Proposed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'deprecated', label: 'Deprecated' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'draft', label: 'Draft' },
];

/** Status-Filter-Dropdown mit URL-Persistenz. */
export default function AdrToolbar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';

  const handleSelect = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set('status', value);
    } else {
      next.delete('status');
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <Dropdown
      items={STATUS_OPTIONS}
      selectedValue={status}
      onSelect={handleSelect}
      placeholder="Status"
    />
  );
}
