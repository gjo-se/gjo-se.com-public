import Button from '@src/components/primitives/Button';
import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';

import Card, { CardContent } from '../primitives/Card';

import type { TableToolbarProps } from './TableToolbar.interface';

/** Standard toolbar as Card with search, filters, reset button and entry count. */
export default function TableToolbar({
  searchValue,
  onSearchChange,
  onReset,
  total,
  loading,
  searchPlaceholder = 'Suchen…',
  filterElements,
  children,
}: TableToolbarProps) {
  const hasFilters = (filterElements && filterElements.length > 0) || children;

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-64">
              <Input
                type="search"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>
            {hasFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {filterElements}
                {children}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onReset}>
              Reset
            </Button>
            {!loading && (
              <Text as="span" color="muted" size="sm">
                {total} {total === 1 ? 'Eintrag' : 'Einträge'}
              </Text>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
