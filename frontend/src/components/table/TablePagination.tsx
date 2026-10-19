import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';

import Dropdown from '../molecules/Dropdown/Dropdown';

import type { TablePaginationProps } from './TablePagination.interface';

/** Pagination controls with prev/next buttons, page info and page size selector. */
export default function TablePagination<TData>({ table, totalCount }: TablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const currentPage = pageIndex + 1;
  const displayTotal = totalCount ?? table.getFilteredRowModel().rows.length;

  const pageSizeOptions = [10, 20, 50, 100];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        ← Zurück
      </Button>

      <Text as="span" color="muted" size="sm">
        Seite {currentPage} von {pageCount > 0 ? pageCount : 1}
      </Text>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        Weiter →
      </Button>

      <Dropdown
        items={pageSizeOptions.map((size) => ({ value: String(size), label: `${size} / Seite` }))}
        selectedValue={String(pageSize)}
        onSelect={(value) => table.setPageSize(Number(value))}
      />

      {displayTotal > 0 && (
        <Text as="label" color="muted" size="sm">
          {displayTotal} {displayTotal === 1 ? 'Eintrag' : 'Einträge'}
        </Text>
      )}
    </div>
  );
}
