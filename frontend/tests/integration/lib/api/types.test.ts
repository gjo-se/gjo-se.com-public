import { expectTypeOf, it } from 'vitest';

import type { PaginatedParams } from '@src/lib/api/types';

it('keeps every paginated parameter optional', () => {
  expectTypeOf<PaginatedParams>().toEqualTypeOf<{
    offset?: number;
    limit?: number;
    q?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }>();
});

it('restricts the sort order to asc and desc', () => {
  expectTypeOf<PaginatedParams['sort_order']>().toEqualTypeOf<'asc' | 'desc' | undefined>();
});
