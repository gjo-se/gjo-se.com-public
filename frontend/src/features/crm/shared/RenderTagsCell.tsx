import TagBadge from '@src/components/atoms/TagBadge/TagBadge';
import Text from '@src/components/primitives/Text';
import type { ColorToken } from '@src/lib/colorTokens';

import type { ReactNode } from 'react';

/**
 * Renders a tags cell: up to 3 tag badges plus a "+N" overflow hint.
 *
 * Shared by the CRM company and person column definitions.
 */
export function renderTagsCell(row: Record<string, unknown>): ReactNode {
  const tags = row['tags'] as { name: string; color_token: string; category?: string }[] | undefined;
  if (!tags || tags.length === 0) return <Text size="sm" color="muted">{'\u2013'}</Text>;
  const max = 3;
  const visible = tags.slice(0, max);
  const overflow = tags.length - max;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((t) => (
        <TagBadge key={t.name} name={t.name} colorToken={t.color_token as ColorToken} category={t.category} variant="dot" />
      ))}
      {overflow > 0 && (
        <div className="ml-0.5">
          <Text size="xs" color="muted">+{overflow}</Text>
        </div>
      )}
    </div>
  );
}
