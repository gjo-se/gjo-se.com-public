import { useEffect, useState } from 'react';

import { createCoreTag, fetchCoreTags, type CoreTagOut } from '@src/lib/api/coreCatalog';
import type { ColorToken } from '@src/lib/colorTokens';

// ── Create Tag Logic ────────────────────────────────────────────────────────

/**
 * Creates a new core tag via the admin API and returns its ID.
 * Throws on failure.
 */
export async function createTag(
  name: string,
  category: string,
  colorToken: ColorToken,
): Promise<number> {
  const created = await createCoreTag({
    name,
    category,
    color_token: colorToken,
  });
  return created.id;
}

// ── Tag Search Hook ─────────────────────────────────────────────────────────

/**
 * Fetches all core tags via the admin API on mount.
 * Client-side filtering is handled by EntityPicker's `filterOptions`.
 */
export function useTagSearch(taggableType?: string): {
  tags: CoreTagOut[];
  loading: boolean;
} {
  const [tags, setTags] = useState<CoreTagOut[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await fetchCoreTags(undefined, undefined, taggableType);
        if (!cancelled) setTags(result);
      } catch {
        if (!cancelled) setTags([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [taggableType]);

  return { tags, loading };
}
