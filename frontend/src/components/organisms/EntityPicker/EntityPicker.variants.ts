import { cva, type VariantProps } from 'class-variance-authority';

/** Breite des Picker-Popovers. */
export const entityPickerPopoverVariants = cva('w-72');

/** Scroll-Liste der Optionen im Popover. */
export const entityPickerOptionsVariants = cva('mt-2 max-h-64 overflow-y-auto');

/** Inline-Anlege-Bereich (abgesetzt durch obere Haarlinie). */
export const entityPickerCreateAreaVariants = cva('mt-2 border-t pt-2');

export type EntityPickerVariants = VariantProps<typeof entityPickerPopoverVariants>;
