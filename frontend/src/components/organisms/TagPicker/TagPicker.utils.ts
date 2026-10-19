import type { CoreTagOut } from '@src/lib/api/coreCatalog';

/** Builds bidirectional ID↔Slug lookup maps. */
export function buildIdSlugMaps(tags: CoreTagOut[]): {
  idToSlug: Map<number, string>;
  slugToId: Map<string, number>;
} {
  const idToSlug = new Map<number, string>();
  const slugToId = new Map<string, number>();
  tags.forEach((tag) => {
    idToSlug.set(tag.id, tag.slug);
    slugToId.set(tag.slug, tag.id);
  });
  return { idToSlug, slugToId };
}
