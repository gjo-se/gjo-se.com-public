/**
 * AdrTagsBadges – Badge-Liste der Tags einer ADR.
 */

import Chip from '@src/components/primitives/Chip/Chip';
import Text from '@src/components/primitives/Text';

/** Badge-Liste fuer Tags (z.B. tooling, C4). */
export default function AdrTagsBadges({ tags }: { tags: string[] }) {
  if (!tags.length) {
    return <Text as="span" size="sm" color="muted">–</Text>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Chip key={tag} variant="ghost" size="sm">
          {tag}
        </Chip>
      ))}
    </div>
  );
}
