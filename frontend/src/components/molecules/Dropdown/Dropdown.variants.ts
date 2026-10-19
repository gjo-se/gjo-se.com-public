import { cva, type VariantProps } from 'class-variance-authority';

/** Ausklapp-Panel der Auswahlliste (Listbox). */
export const dropdownPanelVariants = cva(
  'absolute z-50 mt-1 w-full min-w-40 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg list-none',
);

/** Leerzustand-Zeile innerhalb des Panels („Keine Ergebnisse/Optionen"). */
export const dropdownEmptyOptionVariants = cva('px-3 py-2 text-xs text-on-surface-muted');

export type DropdownVariants = VariantProps<typeof dropdownPanelVariants>;
