import { useCallback, useMemo, useState } from 'react';

import EntityPicker from '@src/components/organisms/EntityPicker/EntityPicker';
import type { EntityOption } from '@src/components/organisms/EntityPicker/EntityPicker.types';
import { createCoreTag, type CoreTagOut } from '@src/lib/api/coreCatalog';
import type { ColorToken } from '@src/lib/colorTokens';

import { useTagSearch } from './TagPicker.logic';
import { buildIdSlugMaps } from './TagPicker.utils';

import type { TagPickerProps } from './TagPicker.interface';

export type { TagPickerProps } from './TagPicker.interface';

/**
 * TagPicker – Adapter facade over EntityPicker.
 *
 * Keeps the ID-based interface (`selectedTagIds`, `onTagsChange`) unchanged
 * while delegating to the slug-based EntityPicker internally.
 */
export default function TagPicker({
  selectedTagIds,
  onTagsChange,
  taggableType,
  placeholder = 'Tags suchen...',
  disabled = false,
  showSearch = true,
  showCreate = true,
}: TagPickerProps) {
  const { tags: fetchedTags } = useTagSearch(taggableType);
  const [createdTags, setCreatedTags] = useState<CoreTagOut[]>([]);

  // Merge fetched + locally created tags, deduped by id
  const allTags = useMemo(() => {
    const seen = new Set<number>();
    const merged: CoreTagOut[] = [];
    fetchedTags.forEach((tag) => {
      if (!seen.has(tag.id)) {
        seen.add(tag.id);
        merged.push(tag);
      }
    });
    createdTags.forEach((tag) => {
      if (!seen.has(tag.id)) {
        seen.add(tag.id);
        merged.push(tag);
      }
    });
    return merged;
  }, [fetchedTags, createdTags]);

  const entityOptions = useMemo(() => toEntityOptions(allTags), [allTags]);
  const { idToSlug, slugToId } = useMemo(() => buildIdSlugMaps(allTags), [allTags]);

  // Resolve selected IDs to slugs for EntityPicker
  const selectedSlugs = useMemo(
    () =>
      selectedTagIds
        .map((id) => idToSlug.get(id))
        .filter((s): s is string => s != null),
    [selectedTagIds, idToSlug],
  );

  // onKeysChange: slugs → IDs → onTagsChange(ids)
  const handleKeysChange = useCallback(
    (slugs: string[]) => {
      const ids = slugs
        .map((slug) => slugToId.get(slug))
        .filter((id): id is number => id != null);
      onTagsChange(ids);
    },
    [slugToId, onTagsChange],
  );

  // onCreate: create tag via API, add to local state, return slug
  const handleCreate = useCallback(
    async (name: string, category?: string, colorToken?: string): Promise<string> => {
      const created = await createCoreTag({
        name,
        category: category || 'General',
        color_token: (colorToken || 'gray') as ColorToken,
      });
      setCreatedTags((prev) => [...prev, created]);
      return created.slug;
    },
    [],
  );

  return (
    <EntityPicker
      entityType="tag"
      selectionMode="multi"
      options={entityOptions}
      selectedKeys={selectedSlugs}
      onKeysChange={handleKeysChange}
      grouped
      showSearch={showSearch}
      showCreate={showCreate}
      onCreate={handleCreate}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

// ── TagPicker (Facade) ─────────────────────────────────────────────────────

/** Converts CoreTagOut[] to EntityOption[] for the EntityPicker. */
function toEntityOptions(tags: CoreTagOut[]): EntityOption[] {
  return tags.map((tag) => ({
    slug: tag.slug,
    name: tag.name,
    colorToken: tag.color_token,
    category: tag.category,
  }));
}
