import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { createListQuery } from '@src/lib/api/queries';

interface ItemProbe {
  id: number;
}

interface FilterProbe {
  q: string;
}

describe('createListQuery', () => {
  it('builds the cache key and delegates execution to the fetch function', async () => {
    let calls = 0;
    const fetchFn = async (): Promise<{ items: ItemProbe[]; total: number }> => {
      calls += 1;
      return { items: [{ id: 1 }], total: 1 };
    };

    const options = createListQuery<ItemProbe, FilterProbe>('portfolios', fetchFn)({ q: 'x' });
    const data = await new QueryClient().fetchQuery(options);

    expect(options.queryKey).toEqual(['portfolios', 'list', { q: 'x' }]);
    expect(data.items).toEqual([{ id: 1 }]);
    expect(calls).toBe(1);
  });

  it('keeps different filters in distinct cache keys', () => {
    const fetchFn = async (): Promise<{ items: ItemProbe[]; total: number }> => ({
      items: [],
      total: 0,
    });
    const factory = createListQuery<ItemProbe, FilterProbe>('portfolios', fetchFn);

    expect(factory({ q: 'a' }).queryKey).not.toEqual(factory({ q: 'b' }).queryKey);
  });
});
