/**
 * TagCell – Displays skill tags as colored TagBadges in the skill data table.
 */

import TagBadge from '@src/components/atoms/TagBadge/TagBadge';
import Text from '@src/components/primitives/Text';
import type { ColorToken } from '@src/lib/colorTokens';

interface TagCellProps {
  tags: TagCellTag[];
}

interface TagCellTag {
  tag_name: string;
  tag_color_token: string;
}

/** Renders skill tags as TagBadges with color_token-derived colors; shows a muted dash when no tags are assigned. */
function TagCell({ tags }: TagCellProps) {
  if (!tags || tags.length === 0) {
    return <Text as="span" size="xs" color="muted">—</Text>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <TagBadge key={tag.tag_name} name={tag.tag_name} colorToken={tag.tag_color_token as ColorToken} />
      ))}
    </div>
  );
}

export default TagCell;
