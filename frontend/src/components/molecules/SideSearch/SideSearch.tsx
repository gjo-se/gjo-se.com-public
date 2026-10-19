import { useCallback } from 'react';

import SearchBar from '../../forms/SearchBar/SearchBar';

import { sideSearchVariants } from './SideSearch.variants';

export interface SideSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}
/**
 * SideSearch – Sticky Suchleiste für Seiten mit vielen Komponenten.
 * Wrappt SearchBar mit Escape-Support und Sticky-Positionierung.
 * No className prop – Styling exclusively via Props.
 *
 * @example
 * <SideSearch value={query} onChange={setQuery} placeholder="Komponente suchen..." />
 */
export default function SideSearch({
  value,
  onChange,
  placeholder = 'Suchen...',
}: SideSearchProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onChange('');
    },
    [onChange],
  );

  return (
    <div
      className={sideSearchVariants()}
      onKeyDown={handleKeyDown}
    >
      <SearchBar value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

export type { SideSearchVariants } from './SideSearch.variants';
