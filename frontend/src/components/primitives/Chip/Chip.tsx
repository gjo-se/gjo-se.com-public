import { cn } from '@src/lib/utils';

import { chipVariants } from './Chip.variants';

import type { ChipProps } from './Chip.interface';

/**
 * Chip – Compact label with optional remove and select states.
 */
export default function Chip({
  variant = 'default',
  size = 'md',
  shape = 'pill',
  selected = false,
  onClick,
  onRemove,
  disabled,
  children,
}: ChipProps) {
  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      disabled={disabled}
      onClick={onClick}
      className={cn(
        chipVariants({ variant: selected ? 'primary' : variant, size, shape }),
        onClick && 'cursor-pointer',
        selected && 'ring-2 ring-primary ring-offset-1',
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 shrink-0 rounded-full text-xs leading-none hover:bg-black/10 dark:hover:bg-white/20"
        >
          ×
        </button>
      )}
    </Tag>
  );
}
