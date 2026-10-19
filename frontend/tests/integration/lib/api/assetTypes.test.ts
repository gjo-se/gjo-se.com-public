import { expectTypeOf, it } from 'vitest';

import type { AssetInfo } from '@src/lib/api/assetTypes';

it('pins the asset listing contract used by the object-store picker', () => {
  expectTypeOf<AssetInfo>().toHaveProperty('key');
  expectTypeOf<AssetInfo>().toHaveProperty('name');
  expectTypeOf<AssetInfo['createdAt']>().toEqualTypeOf<string>();
});

it('requires every asset field to be present', () => {
  expectTypeOf<AssetInfo>().toEqualTypeOf<{
    key: string;
    name: string;
    createdAt: string;
  }>();
});
