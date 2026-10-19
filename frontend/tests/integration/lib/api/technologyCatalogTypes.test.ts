import { expectTypeOf, it } from 'vitest';

import type {
  TechnologyCatalogEntry,
  TechnologyCatalogParams,
  TechnologyListCount,
} from '@src/lib/api/technologyCatalogTypes';

it('pins the count wrapper exposed by the list endpoint', () => {
  expectTypeOf<TechnologyListCount>().toEqualTypeOf<{ total: number }>();
});

it('keeps the sort direction restricted to asc and desc', () => {
  expectTypeOf<TechnologyCatalogParams['sort_dir']>().toEqualTypeOf<'asc' | 'desc' | undefined>();
});

it('keeps the catalog entry fields aligned with the admin list', () => {
  expectTypeOf<TechnologyCatalogEntry>().toHaveProperty('slug');
  expectTypeOf<TechnologyCatalogEntry>().toHaveProperty('icons');
  expectTypeOf<TechnologyCatalogEntry['icons'][number]>().toHaveProperty('icon_url');
});
