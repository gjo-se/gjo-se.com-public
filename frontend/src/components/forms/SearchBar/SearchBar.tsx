import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';
import Input from '@src/components/primitives/Input';

import { cn } from '../../../lib/utils';

import type { SearchBarProps } from './SearchBar.interface';
/**
 * SearchBar – Sucheingabe mit Icon und Clear-Button.
 * No className prop – Styling exclusively via value/placeholder.
 *
 * @example
 * <SearchBar value={query} onChange={setQuery} placeholder="Projekte suchen..." />
 */
export default function SearchBar({ value, onChange, placeholder = 'Suchen...' }: SearchBarProps) {
  return (
    <div className={cn('relative flex items-center')}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        leftIcon="search"
        aria-label={placeholder}
      />
      {value && (
        <div className="absolute right-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onChange('')}
            aria-label="Suche zurücksetzen"
          >
            <Icon name="x" size="xs" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}

export type { SearchBarProps } from './SearchBar.interface';
