/**
 * TagAssignCell – Multi-select tag assignment for a skill row.
 *
 * Fetches current tag assignments via core_taggable API
 * and renders the TagPicker organism for selection.
 * Persists changes immediately via PUT /admin/tagging/taggable/fbf_skill/{id}.
 */

import { useCallback, useEffect, useState } from 'react';

import TagPicker from '@src/components/organisms/TagPicker/TagPicker';
import Spinner from '@src/components/primitives/Spinner';
import { fetchTaggableTags, setTaggableTags } from '@src/lib/api/coreCatalog';
import { showErrorToast } from '@src/lib/errorToast';

export interface TagAssignCellProps {
  /** ID of the skill to assign tags to. */
  skillId: number;
  /** Called after tags are successfully updated so the parent can reload. */
  onTagsChanged?: () => void;
}

/** Renders a TagPicker for assigning core tags to an FBF skill. */
export default function TagAssignCell({ skillId, onTagsChanged }: TagAssignCellProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const assignments = await fetchTaggableTags('fbf_skill', skillId);
        if (cancelled) return;
        setSelectedIds(assignments.map((a) => a.tag_id));
      } catch {
        if (!cancelled) showErrorToast('Fehler beim Laden der Tags.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [skillId]);

  const handleChange = useCallback(
    async (tagIds: number[]) => {
      setSelectedIds(tagIds);
      try {
        await setTaggableTags('fbf_skill', skillId, tagIds);
        onTagsChanged?.();
      } catch {
        showErrorToast('Fehler beim Zuweisen der Tags.');
        onTagsChanged?.();
      }
    },
    [skillId, onTagsChanged],
  );

  if (loading) return <Spinner size="sm" />;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <TagPicker
        selectedTagIds={selectedIds}
        onTagsChange={handleChange}
        taggableType="fbf_skill"
        showSearch={false}
        showCreate={false}
      />
    </div>
  );
}
