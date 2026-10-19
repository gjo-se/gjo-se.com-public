import { cn } from '@src/lib/utils';

import { textElements, textWeights } from './Text.registry';
import { LINE_CLAMP_CLASS } from './Text.utils';
import { textVariants } from './Text.variants';

import type { TextProps } from './Text.interface';

/**
 * Text – Typography component with semantic element mapping, variants, and design tokens.
 */
export default function Text({
  variant = 'body',
  as,
  weight,
  size,
  color,
  align,
  mono = false,
  uppercase = false,
  tabular = false,
  lineClamp,
  id,
  title,
  onClick,
  onDoubleClick,
  children,
}: TextProps) {
  const resolvedVariant = variant!;
  const Tag = (as ?? textElements[resolvedVariant]) as React.ElementType;
  const defaultWeight = textWeights[resolvedVariant];
  const showWeight = weight && weight !== defaultWeight;

  return (
    <Tag
      id={id}
      title={title}
      className={cn(
        textVariants({ variant, size, color, align, weight: showWeight ? weight : undefined }),
        mono && 'font-mono',
        uppercase && 'uppercase',
        tabular && 'tabular-nums',
        lineClamp && LINE_CLAMP_CLASS[lineClamp],
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </Tag>
  );
}
