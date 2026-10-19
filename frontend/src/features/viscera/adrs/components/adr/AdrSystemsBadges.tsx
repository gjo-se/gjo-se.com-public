/**
 * AdrSystemsBadges – Badge-Liste der betroffenen Systeme einer ADR.
 */

import Chip from '@src/components/primitives/Chip/Chip';
import Text from '@src/components/primitives/Text';

/** Badge-Liste fuer Systems (z.B. Backend, Frontend). */
export default function AdrSystemsBadges({ systems }: { systems: string[] }) {
  if (!systems.length) {
    return <Text as="span" size="sm" color="muted">–</Text>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {systems.map((sys) => (
        <Chip key={sys} variant="outline" size="sm">
          {sys}
        </Chip>
      ))}
    </div>
  );
}
