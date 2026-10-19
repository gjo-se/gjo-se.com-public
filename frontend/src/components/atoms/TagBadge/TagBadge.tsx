import Button from '@src/components/primitives/Button/Button';
import Icon from '@src/components/primitives/Icon/Icon';
import Text from '@src/components/primitives/Text/Text';
import { COLOR_TOKEN_CSS } from '@src/lib/colorTokens';
import { cn } from '@src/lib/utils';

import type { TagBadgeProps } from './TagBadge.interface';

/**
 * TagBadge – colour-coded tag rendered as an inline dot (tables) or chip badge (detail views).
 *
 * Colours are driven exclusively by `colorToken` via `COLOR_TOKEN_CSS`.
 * The hover tooltip shows the tag name and optional category.
 */
export default function TagBadge({
  name,
  colorToken,
  category,
  variant = 'chip',
  onRemove,
  size = 'md',
}: TagBadgeProps) {
  const css = COLOR_TOKEN_CSS[colorToken];
  const tooltip = `${name}${category ? ` · ${category}` : ''}`;

  if (variant === 'dot') {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        title={tooltip}
      >
        <span
          className={cn(
            'rounded-full shrink-0',
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
            css.dot,
          )}
        />
        <Text size={size}>{name}</Text>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        css.bg,
        css.text,
        css.border,
        size === 'sm' ? 'px-1.5 py-0 text-1xs' : 'px-2 py-0.5 text-xs',
      )}
      title={tooltip}
    >
      {name}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          aria-label={`Tag ${name} entfernen`}
        >
          <Icon name="x" size="xs" />
        </Button>
      )}
    </span>
  );
}

export type { TagBadgeProps } from './TagBadge.interface';
