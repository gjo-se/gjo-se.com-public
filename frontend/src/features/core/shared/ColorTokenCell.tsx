/**
 * ColorTokenCell – Inline color picker for table cells.
 *
 * Displays a colored dot + color name. Click opens a Popover with the
 * TagColorPalette. Select a swatch → saves via onSave, closes the popover.
 *
 * Uses @base-ui/react/popover primitives (portal, positioning, click-outside,
 * Escape handling built-in).
 *
 * Used by TagDefinitionListPage and StatusDefinitionListPage hooks.
 */

import { cva } from 'class-variance-authority';
import { useCallback, useState } from 'react';

import TagColorPalette from '@src/components/atoms/TagColorPalette/TagColorPalette';
import Popover from '@src/components/primitives/Popover/Popover';
import PopoverContent from '@src/components/primitives/Popover/PopoverContent';
import PopoverTrigger from '@src/components/primitives/Popover/PopoverTrigger';
import Text from '@src/components/primitives/Text';
import { getColorBg } from '@src/lib/colorTokens';
import { COLOR_TOKEN_META, type ColorToken } from '@src/lib/colorTokens';

interface ColorTokenCellProps {
  value: string;
  onSave: (next: string) => Promise<void>;
}

/** Trigger-Fläche der Zelle – Farbpunkt + Label, dezent hervorgehoben. */
const triggerVariants = cva(
  'flex items-center gap-1.5 rounded px-1 -mx-1 hover:bg-gray-100 dark:hover:bg-gray-700',
);

/**
 *
 */
export default function ColorTokenCell({ value, onSave }: ColorTokenCellProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(async (token: ColorToken) => {
    await onSave(token);
    setOpen(false);
  }, [onSave]);

  // Canonical english family + hex (S1 vocabulary), shared with the charts.
  const meta = COLOR_TOKEN_META[value as ColorToken]
    ?? { label: String(value), hex: '' };
  const label = meta.hex ? `${meta.label} · ${meta.hex}` : meta.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className={triggerVariants()}>
          <div className={['inline-block size-3 rounded-full shrink-0', getColorBg(value)].join(' ')} />
          <Text as="span" size="xs" color="muted">{label}</Text>
        </div>
      </PopoverTrigger>
      <PopoverContent sideOffset={4}>
        <div className="p-2">
          <TagColorPalette
            value={value as ColorToken}
            onSelect={handleSelect}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
